const PORT = 4444

const express = require('express')
const app = express()

app.use('/', express.static('./public'))

app.listen(PORT, function () {
  console.log(`memory-paging-simulation started on port ${PORT}.`)
})
