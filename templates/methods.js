if (Meteor.isServer) {
    Meteor.methods({
        cueDropTasks: function() {
            Cue.dropTasks()
        },

        cueDropTask: function(taskId) {
            check(taskId, String)
            Cue.dropTask(taskId)
        },

        cueRetryTask: function(taskId) {
            check(taskId, String)
            Cue.retryTask(taskId)
        },

        cueResetStats: function() {
            Cue.resetStats()
        },

        cueStop: function() {
            Cue.stop()
        },

        cueStart: function() {
            Cue.start()
        },

        cuePause: function() {
          Cue.pause();
        },

        cueUnpause: function() {
          Cue.unpause();
        },

        cueRestartInProgressTasks: function() {
            Cue.restartInProgressTasks()
        },

        cueJobNames: function() {
            return _.pluck(Cue.jobs, 'name')
        },

        cueRunJob: function(name, options, data) {
            check(name, String)
            check(options.isAsync, Boolean)
            check(options.unique, Boolean)
            check(data, Object)
            Cue.addTask(name, options, data)
        }
    })
}
