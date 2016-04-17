angular.module('schemaForm')
  .directive('sfPreventDefault', function() {
    return function(scope, element, attrs) {
      angular.element(element).bind('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
      });
    }
  })
  .directive('sfS3Upload', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      templateUrl: 'directives/decorators/bootstrap/s3-upload/s3-upload-directive.html',
      link: function(scope, element, attrs, ngModel) {
        console.log('sfS3Upload link', scope, element, attrs, ngModel);
        scope.loadedAt = Date.now();
        scope.currentFiles = [];
        scope.removeFile = function(file) {
          var idx = scope.currentFiles.indexOf(file);
          if (idx >= 0) {
            scope.currentFiles.splice(idx, 1);

            if (scope.form.multiple) {
              ngModel.$setViewValue(scope.currentFiles);
            }
            else {
              scope.currentFiles = [];
              ngModel.$setViewValue(null);
            }
          }
        };
        scope.$watchCollection(function() {
          return ngModel.$modelValue;
        }, function(val) {
          if (!val) {
            scope.currentFiles = [];
            return;
          }
          if (!Array.isArray(val))
            val = [val];
          scope.currentFiles = val;
          /*if (!scope.form.resultField) {
            scope.currentFiles = val.filter(function(file) {
              return file.contentType.slice(0, 6) === 'image/';
            }).map(function(file) {
              return file.location;
            });
          }
          else if (scope.form.resultField === 'location') {
            // TODO: how can we tell it's all images?
            scope.currentFiles = val;
          }*/
          console.log('current files now', scope.currentFiles);
        });
        scope.$watchCollection('uploaded', function(files) {
          console.log('uploaded files:', files);
          if (!files || files.length == 0)
            return;
          if (scope.form.multiple) {
            scope.currentFiles = scope.currentFiles.concat(files);
            ngModel.$setViewValue(scope.currentFiles);
          }
          else {
            // single file mode, replace the current value
            scope.currentFiles = files.slice(-1);
            console.log('current files now2', scope.currentFiles);
            if (scope.form.resultField && typeof scope.form.resultField === 'string')
              ngModel.$setViewValue(scope.currentFiles[0][scope.form.resultField]);
            else
              ngModel.$setViewValue(scope.currentFiles[0]);
          }
          console.log('after update ngModel:', ngModel);
          // clear the list.
          scope.uploaded = [];
        });
      },
      controller: ['$scope', '$upload', '$http',
        function($scope, $upload, $http) {
          console.log('sfS3Upload controller init', $scope);
          $scope.uploaded = [];
          $scope.abort = function(index) {
            $scope.upload[index].abort();
            $scope.upload[index] = null;
          };
          if (!$scope.form || !$scope.form.s3Options || !$scope.form.s3Options.policyUrl /* || !$scope.form.s3Options.bucket && !$scope.form.s3Options.endpoint*/ )
            throw new Error('form s3Options policyUrl is required for s3-upload type');

          $scope.getThumbnailUrl = function(file) {
            return file.thumbnailUrl || file.location || file;
          };
          $scope.getFileUrl = function(file) {
            return file.location || file;
          };
          $scope.hasThumbnail = function(file) {
            if (file.thumbnailUrl)
              return true;
            if (file.contentType && file.contentType.slice(0, 6) === 'image/')
              return true;
            var ext = (file.name || file).split('.').pop().toLowerCase();
            return ['jpg', 'jpeg', 'png', 'gif'].indexOf(ext) >= 0;
          };
          $scope.getFileName = function(file) {
            return file.name || file.split('?')[0].split('/').pop().replace(/\.\d{13}(\.[^.]+)?$/, '$1');
          };
          /*$scope.thumbnailFilter = function() {
            return function(item) {
              if (typeof item === 'string')
                return true;
              if (item.contentType.slice(0, 6) === 'image/')
                return true;
              return false;
            }
          };*/
          $scope.onFileSelect = function($files) {
            console.log('onFileSelect', $files);
            $scope.files = $files;
            $scope.upload = [];
            for (var i = 0; i < $files.length; i++) {
              var file = $files[i];
              console.log(file);
              file.progress = parseInt(0);
              (function(file, i) {
                var policyUrl = $scope.form.s3Options.policyUrl;
                policyUrl += policyUrl.indexOf('?') >= 0 ? '&' : '?';
                policyUrl += 'mimeType=' + file.type + '&name=' + encodeURIComponent(file.name);
                $http.get(policyUrl).success(function(response) {
                  console.log(response);
                  var s3Params = response;
                  $scope.upload[i] = $upload.upload({
                    url: s3Params.endpoint,
                    method: 'POST',
                    transformRequest: function(data, headersGetter) {
                      //Headers change here
                      var headers = headersGetter();
                      delete headers['Authorization'];
                      return data;
                    },
                    fields: {
                      'key': s3Params.key,
                      'acl': s3Params.acl || 'public-read',
                      'Content-Type': file.type,
                      'AWSAccessKeyId': s3Params.AWSAccessKeyId,
                      'success_action_status': '201',
                      'Policy': s3Params.s3Policy,
                      'Signature': s3Params.s3Signature
                    },
                    file: file,
                  });
                  $scope.upload[i]
                    .then(function(response) {
                      file.progress = parseInt(100);
                      if (response.status === 201) {
                        var data = xml2json.parser(response.data),
                          parsedData;
                        parsedData = {
                          location: data.postresponse.location,
                          bucket: data.postresponse.bucket,
                          key: data.postresponse.key,
                          etag: data.postresponse.etag,
                          contentType: file.type,
                          size: file.size,
                          name: file.name,
                          uploadedAt: Date.now()
                        };
                        if (typeof $scope.form.s3Options.postUpload == 'function') {
                          parsedData = $scope.form.s3Options.postUpload(parsedData);
                        }
                        console.log(parsedData);
                        $scope.uploaded.push(parsedData);

                      } else {
                        alert('Upload Failed');
                      }
                    }, null, function(evt) {
                      file.progress = parseInt(100.0 * evt.loaded / evt.total);
                    });
                });
              }(file, i));
            }
          };
        }
      ]
    };
  });
