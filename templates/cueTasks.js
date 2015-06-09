if (Meteor.isClient) {
    Template.cueTasks.helpers({
        tasks: function() {
            return CueTasks.find({},{sort: {createdAt:1}});
        },

        isStopped: function() {
            var stopped = CueData.findOne({name:'stopped'});
            if (stopped) {
                return stopped.value;
            }

        }
    });


    Template.cueTask.helpers({
        taskData: function() {
            return EJSON.stringify(this.data, {indent:true, canonical:true});
        }
    });


    Template.cueTasks.events({
        'click #dropTasksButton': function(event, template) {
            event.preventDefault();
            Meteor.call('cueDropTasks');
        },

        'click #unpauseButton': function(event, template) {
            event.preventDefault();
            Meteor.call('cueUnpause');
        },

        'click #pauseButton': function(event, template) {
            event.preventDefault();
            Meteor.call('cuePause');
        },

        'click #dropInProgressTasksButton': function(event, template) {
            event.preventDefault();
            Meteor.call('cueDropInProgressTasks');
        },

        'click #restartInProgressTasksButton': function(event, template) {
            event.preventDefault();
            Meteor.call('cueRestartInProgressTasks');
        }
    });


    Template.cueTask.events({
        'click .dropTaskButton': function(event, template) {
            event.preventDefault();
            var id = event.currentTarget.getAttribute('data-id');
            Meteor.call('cueDropTask', id);
        },

        'click .retryTaskButton': function(event, template) {
            event.preventDefault();
            var id = event.currentTarget.getAttribute('data-id');
            Meteor.call('cueRetryTask', id);
        }
    });


    Template.cueTasks.created = function() {
        this.autorun(function() {
            Meteor.subscribe('cueTasks');
            Meteor.subscribe('cueStatus');
        });
    };
}
