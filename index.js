var http = require('http')
var request = require('request')
var config = require('./config')
var formBody = require('body/form')
var parseArgs = require('minimist')
var spawnargs = require('spawn-args')

// Caution: Alfred E. Neuman error handling throughout

var srv = http.createServer(function (req, res) {
  // parse post from slack
  formBody(req, res, function (err, body) {
    if (err) {
      res.statusCode = 500
      return res.end('Something broke.')
    }
    var token = body.token.trim()
    var channelId = body.channel_id
    var args = spawnargs(body.text)
    args = parseArgs(args)
    // console.dir(args)
    var h = {}
    if (args.H) {
      args.H.forEach(function (element, index, array) {
        var header = element.slice(1, -1).split(':')
        h[header[0]] = header[1]
      })
    }
    // make curl request
    request(
      {
        method: args.X,
        uri: args._[0],
        body: args.d,
        headers: h
      },
      function (error, response, body) {
        if (error) {
          console.log(JSON.stringify(error))
          res.statusCode = 500
          res.end('Could not make the request.')
        } else {
          // apparently all ok
          console.log('success. and there was much rejoicing.')
          var slackbody = {}
          slackbody.channel = channelId
          slackbody.username = 'Hal'
          slackbody.attachments = [{
            fallback: 'API response from ' + args._[0],
            pretext: 'API response from ' + args._[0],
            color: '#FF4300',
            text: '```\n' + body + '\n```',
            mrkdwn_in: ['text']
          }]
          // make request to slack incoming webhook
          request(
            {
              method: 'POST',
              uri: config.webhooks[token],
              json: true,
              body: slackbody
            },
            function (error, response, body) {
              // just fire and forget this, because we are not enterprise grade
              if (error) {
                console.log('request to slack threw an error.')
                console.log(error)
                res.statusCode = 500
                res.end('Error hitting incoming webhook.')
              } else if (response.statusCode === 200) {
                console.log('200 OK.')
                res.statusCode = 200
                res.end('OK')
              } else {
                console.log('Not 200 OK: ' + response.statusCode)
                res.statusCode = response.statusCode
                res.end(response.statusMessage)
              }
            }
          )
        }
      }
    )
  })
})

srv.listen(9000, function () {
  console.log('listening on 9000.')
})
