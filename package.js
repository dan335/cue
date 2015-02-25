Package.describe({
  name: 'danimal:cue',
  version: '1.0.0',
  // Brief, one-line summary of the package.
  summary: 'Queue for Meteor',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.1');
  api.use('mongo');
  api.use('fongandrew:find-and-modify@0.1.2')
  api.addFiles('cue.js');
  api.export('Cue', 'server')
  api.export('CueJob', 'server')
});
