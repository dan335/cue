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
        },

        humanize: function(num) {
          if (num) {
            var dur = moment.duration(Math.round(num))
            var ms = dur.milliseconds()
            var sec = dur.seconds()
            var min = dur.minutes()
            var hours = dur.hours()

            var str = ''

            if (hours) {
                str += hours+':'
            }

            if (min) {
                str += min+':'
            }

            if (sec) {
                str += sec+'.'
            }

            if (ms) {
                str += ms
            }

            return str
          }
        },

        round: function(num) {
          if (num) {
            var parts = num.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
          } else {
            return '-';
          }
        }
    })


    Template.cueStats.created = function() {
        this.autorun(function() {
            Meteor.subscribe('cueStats')
        })
    }

}
