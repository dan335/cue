Template.cueJobs.helpers({
    jobs: function() {
        return Template.instance().jobNames.get()
    }
})


Template.cueJob.events({
    'click .runJobButton': function(event, template) {
        event.preventDefault()

        var name = event.currentTarget.getAttribute('data-name')
        var async = template.$('.asyncCheckbox')
        var unique = template.$('.uniqueCheckbox')
        var data = template.find('.dataInput')

        var options = {
            isAsync: async.is(':checked'),
            unique: unique.is(':checked')
            }

        var dataObject = EJSON.parse($(data).val())

        Meteor.call('cueRunJob', name, options, dataObject)
    }
})


Template.cueJobs.created = function() {
    var self = this
    self.jobNames = new ReactiveVar([])

    Meteor.call('cueJobNames', function(error, result) {
        if (!error && result) {
            self.jobNames.set(result)
        }
    })
}
