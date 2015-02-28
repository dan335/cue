if (Meteor.isClient) {

    Template.cueStats.helpers({
        stats: function() {
            return CueStats.find({}, {sort:{msToday:-1}})
        }
    })


    Template.cueStats.events({
        'click #resetStatsButton': function(event, template) {
            Meteor.call('cueResetStats')
        }
    })


    Template.cueStat.helpers({
        lastRunCalendar: function() {
            return moment(new Date(this.lastRunDate)).calendar()
        },

        average: function() {
            return this.msToday / this.timesRunToday
        }
    })


    Template.cueStats.created = function() {
        this.autorun(function() {
            Meteor.subscribe('cueStats')
        })
    }

}
