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
        }
    })
}
