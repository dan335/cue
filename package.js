Package.describe({
    name: 'danimal:cue',
    version: '1.1.6',
    summary: 'Job Queue for Meteor',
    git: 'https://github.com/dan335/cue',
    documentation: 'README.md'
});

Package.onUse(function(api) {
    api.versionsFrom('1.2');
    api.use(['check', 'mongo']);
    api.use('templating', 'client');
    api.use('reactive-var', 'client');
    api.use('momentjs:moment@2.10.6');
    api.use('fongandrew:find-and-modify@0.2.1');
    api.addFiles([
        'collections.js',
        'templates/methods.js'
        ]);
    api.addFiles([
        'cue.js',
        'templates/publish.js'
        ], 'server');
    api.addFiles([
        'templates/cueJobs.html',
        'templates/cueJobs.js',
        'templates/cueTasks.html',
        'templates/cueTasks.js',
        'templates/cueStats.html',
        'templates/cueStats.js',
        'templates/cue.css'
        ], 'client');
    api.export('Cue', 'server');
    api.export([
        'CueStats',
        'CueData',
        'CueTasks'
        ]);
});
