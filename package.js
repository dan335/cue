Package.describe({
  name: 'danimal:cue',
  version: '1.0.3',
  // Brief, one-line summary of the package.
  summary: 'Queue for Meteor',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/dan335/cue',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.1');
  api.use('mongo');
  api.use(['templating'], 'client');
  api.use('fongandrew:find-and-modify@0.1.2');
  api.use('momentjs:moment@2.9.0');
  api.addFiles([
      'collections.js',
      'templates/methods.js'
      ]);
  api.addFiles([
      'cue.js',
      'templates/publish.js'
      ], 'server');
  api.addFiles([
      'templates/cueTasks.html',
      'templates/cueTasks.js',
      'templates/cueStats.html',
      'templates/cueStats.js',
      'templates/cue.css'
      ], 'client');
  api.export('Cue', 'server')
  api.export('CueJob', 'server')
});
