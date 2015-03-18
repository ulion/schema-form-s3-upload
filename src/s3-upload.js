angular.module('schemaForm')
/*  .directive('sfS3Upload', function() {
    return {
      restrict: 'A',
      //    require: 'ngModel',
      scope: {
      //  ngModel: '='
      },
      link: function(scope, element, attrs) {
        console.log(scope, element, attrs);
      }
    };
  })*/
  .controller("sfS3UploadCtrl", ['$scope', '$upload', '$http',
    function($scope, $upload, $http) {
      console.log('sfS3UploadCtrl init', $scope);
      $scope.imageUploads = [];
      $scope.abort = function(index) {
        $scope.upload[index].abort();
        $scope.upload[index] = null;
      };
      if (!$scope.form || !$scope.form.s3Options || !$scope.form.s3Options.policyUrl/* || !$scope.form.s3Options.bucket && !$scope.form.s3Options.endpoint*/)
        throw new Error('form s3Options policyUrl is required for s3-upload type');

      $scope.onFileSelect = function($files) {
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
                      etag: data.postresponse.etag
                    };
                    $scope.imageUploads.push(parsedData);

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
  ]);
