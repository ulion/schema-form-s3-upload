angular.module('schemaForm').config(
['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
  function(schemaFormProvider,  schemaFormDecoratorsProvider, sfPathProvider) {
    //Add to the bootstrap directive
    schemaFormDecoratorsProvider.addMapping(
      'bootstrapDecorator',
      's3-upload',
      'directives/decorators/bootstrap/s3-upload/s3-upload.html'
    );
    schemaFormDecoratorsProvider.createDirective(
      's3-upload',
      'directives/decorators/bootstrap/s3-upload/s3-upload.html'
    );
  }
]);
