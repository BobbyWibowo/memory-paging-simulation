/* global Chart */

'use strict'

var Memory = function (frames) {
  this.frames = frames.map(function (frame) {
    return new Frame(frame)
  })
  this._unallocated = []
  this._logs = []
}

Memory.prototype = {
  get size() {
    return this.frames.reduce(function (accumulator, frame) {
      return accumulator + frame.size
    }, 0)
  },
  get free() {
    return this.frames.reduce(function (accumulator, frame) {
      return accumulator + frame.free
    }, 0)
  },
  get allocated() {
    return this.size - this.free
  }
}

var Frame = function (size) {
  this.size = size
  this.pages = []
  this._unavailable = false
}

Frame.prototype = {
  get free() {
    return this.pages.reduce(function (accumulator, page) {
      return accumulator - page
    }, this.size)
  },
  get allocated() {
    return this.size - this.free
  }
}

var index = {
  tags: {
    firstFit: 'FF',
    nextFit: 'NF',
    bestFit: 'BF',
    worstFit: 'WF',
    quickFit: 'QF'
  },
  memories: {},
  allocateHalfIndexes: [],
  history: []
}

index.log = function (tag, message) {
  return console.log(tag.toUpperCase() + ': ' + message)
}

index.memlog = function (tag, memory, message) {
  message = tag + ': ' + message
  console.log(message)
  memory._logs.push(message)
}

index.debug = function () {
  return console.log(arguments)
}

index.updateHistory = function (inputs) {
  var arraysEqual = function (array1, array2) {
    if (array1.length !== array2.length) { return false }
    for (var i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) { return false }
    }
    return true
  }

  var historyExists = false
  for (var i = 0; i < index.history.length; i++) {
    if (arraysEqual(index.history[i].pages, inputs.pages) && arraysEqual(index.history[i].frames, inputs.frames)) {
      historyExists = true
      break
    }
  }

  if (historyExists) { return }

  index.history.push(inputs)

  var history = document.getElementById('history')
  history.innerHTML = index.history.map(function (h, i) {
    return '<option value="' + i + '">' + h.pages.join(',') + ' && ' + h.frames.join(',') + '</option>'
  }).join('\n')
}

index.useHistory = function () {
  var history = document.getElementById('history')
  if (history.value === undefined) {
    return alert('Tidak ada history yang terpilih.')
  }

  var _index = parseInt(history.value)
  if (isNaN(_index) || !index.history[_index]) {
    return alert('History yang dipilih tidak valid.')
  }

  document.getElementById('pages').value = index.history[_index].pages
  document.getElementById('frames').value = index.history[_index].frames
}

index.parseInputs = function () {
  var inputs = {
    pages: document.getElementById('pages').value
      .split(',')
      .map(function (i) { return parseInt(i) }),
    frames: document.getElementById('frames').value
      .split(',')
      .map(function (i) { return parseInt(i) })
  }

  if (inputs.pages.filter(function (page) { return isNaN(page) }).length) {
    return alert('Ada input page yang tidak valid.')
  }

  if (inputs.frames.filter(function (frame) { return isNaN(frame) }).length) {
    return alert('Ada input frame yang tidak valid.')
  }

  if (inputs.pages.length >= inputs.frames.length) {
    return alert('Jumlah frame harus LEBIH BANYAK dari jumlah page. Anda memasukkan ' + inputs.pages.length + ' page, sementara anda hanya menyediakan ' + inputs.frames.length + ' frame.')
  }

  index.updateHistory(inputs)
  return inputs
}

index.parseCheckboxes = function () {
  return {
    firstFit: document.getElementById('firstFit').checked,
    nextFit: document.getElementById('nextFit').checked,
    bestFit: document.getElementById('bestFit').checked,
    worstFit: document.getElementById('worstFit').checked,
    quickFit: document.getElementById('quickFit').checked
  }
}

index.allocateHalf = function (tag, memory) {
  if (!document.getElementById('allocateHalf').checked) { return }

  index.log(tag, 'Marking 50% frames as unavailable.')

  var i, _index
  if (!index.allocateHalfIndexes.length) {
    index.allocateHalfIndexes = Array.apply(null, { length: memory.frames.length }).map(Number.call, Number)
    for (i = 0; i < (memory.frames.length / 2); i++) {
      _index = Math.floor(Math.random() * index.allocateHalfIndexes.length)
      index.allocateHalfIndexes.splice(_index, 1)
    }
  }

  for (i = 0; i < memory.frames.length; i++) {
    if (index.allocateHalfIndexes.indexOf(i) === -1) { continue }
    index.memlog(tag, memory, 'F' + i + ' ' + memory.frames[i].size + ' marked as unavailable.')
    memory.frames[i]._unavailable = true
  }
}

index.firstFit = function (pages, frames) {
  var tag = index.tags.firstFit
  var memory = index.memories.firstFit = new Memory(frames)
  index.allocateHalf(tag, memory)

  index.memlog(tag, memory, 'Memory\'s total size: ' + memory.size + '.')

  var startTime = Date.now()
  pages.forEach(function (page, pageIndex) {
    var frame
    for (var i = 0; i < memory.frames.length; i++) {
      frame = memory.frames[i]
      if (frame._unavailable) { continue }
      if (frame.free >= page) {
        frame.pages.push(page)
        index.memlog(tag, memory, 'P' + pageIndex + ' ' + page + ' allocated to F' + i + ' ' + frame.size + ' (' + frame.free + ' free).')
        return
      }
    }
    memory._unallocated.push({ i: pageIndex, page: page })
  })
  index.log(tag, 'Elapsed time: ' + (Date.now() - startTime) + ' ms.')

  var unallocated = memory._unallocated.map(function (u) { return 'P' + u.i + ' ' + u.page }).join(', ')
  index.memlog(tag, memory, 'Unallocated: ' + unallocated + '.')
}

index.nextFit = function (pages, frames) {
  var tag = index.tags.nextFit
  var memory = index.memories.nextFit = new Memory(frames)
  index.allocateHalf(tag, memory)

  index.memlog(tag, memory, 'Memory\'s total size: ' + memory.size + '.')

  var startTime = Date.now()
  var lastOffset = 0
  pages.forEach(function (page, pageIndex) {
    var frame
    for (var i = 0; i < memory.frames.length; i++) {
      var j = (i + lastOffset) % memory.frames.length
      frame = memory.frames[i]
      if (frame._unavailable) { continue }
      if (frame.free >= page) {
        frame.pages.push(page)
        index.memlog(tag, memory, 'P' + pageIndex + ' ' + page + ' allocated to F' + j + ' ' + frame.size + ' (' + frame.free + ' free).')
        lastOffset = j
        return
      }
    }
    memory._unallocated.push({ i: pageIndex, page: page })
  })
  index.log(tag, 'Elapsed time: ' + (Date.now() - startTime) + ' ms.')

  var unallocated = memory._unallocated.map(function (u) { return 'P' + u.i + ' ' + u.page }).join(', ')
  index.memlog(tag, memory, 'Unallocated: ' + unallocated + '.')
}

index.bestFit = function (pages, frames) {
  var tag = index.tags.bestFit
  var memory = index.memories.bestFit = new Memory(frames)
  index.allocateHalf(tag, memory)

  index.memlog(tag, memory, 'Memory\'s total size: ' + memory.size + '.')

  var startTime = Date.now()
  pages.forEach(function (page, pageIndex) {
    var frame
    var last = {}
    for (var i = 0; i < memory.frames.length; i++) {
      frame = memory.frames[i]
      if (frame._unavailable) { continue }
      if (frame.free >= page) {
        if (last.frame) {
          if (frame.free < last.frame.free) {
            last = { i: i, frame: frame }
          }
        } else {
          last = { i: i, frame: frame }
        }
      }
    }
    if (last.frame) {
      last.frame.pages.push(page)
      index.memlog(tag, memory, 'P' + pageIndex + ' ' + page + ' allocated to F' + last.i + ' ' + last.frame.size + ' (' + last.frame.free + ' free).')
      return
    }
    memory._unallocated.push({ i: pageIndex, page: page })
  })
  index.log(tag, 'Elapsed time: ' + (Date.now() - startTime) + ' ms.')

  var unallocated = memory._unallocated.map(function (u) { return 'P' + u.i + ' ' + u.page }).join(', ')
  index.memlog(tag, memory, 'Unallocated: ' + unallocated + '.')
}

index.worstFit = function (pages, frames) {
  var tag = index.tags.worstFit
  var memory = index.memories.worstFit = new Memory(frames)
  index.allocateHalf(tag, memory)

  index.memlog(tag, memory, 'Memory\'s total size: ' + memory.size + '.')

  var startTime = Date.now()
  pages.forEach(function (page, pageIndex) {
    var last = {}
    var frame
    for (var i = 0; i < memory.frames.length; i++) {
      frame = memory.frames[i]
      if (frame._unavailable) { continue }
      if (frame.free >= page) {
        if (last.frame) {
          if (frame.free > last.frame.free) {
            last = { i: i, frame: frame }
          }
        } else {
          last = { i: i, frame: frame }
        }
      }
    }
    if (last.frame) {
      last.frame.pages.push(page)
      index.memlog(tag, memory, 'P' + pageIndex + ' ' + page + ' allocated to F' + last.i + ' ' + last.frame.size + ' (' + last.frame.free + ' free).')
      return
    }
    memory._unallocated.push({ i: pageIndex, page: page })
  })
  index.log(tag, 'Elapsed time: ' + (Date.now() - startTime) + ' ms.')

  var unallocated = memory._unallocated.map(function (u) { return 'P' + u.i + ' ' + u.page }).join(', ')
  index.memlog(tag, memory, 'Unallocated: ' + unallocated + '.')
}

index.quickFit = function () {
  // TODO: ...
  return false
}

index.drawChartJS = function () {
  index.log('DrawChartJS', 'Drawing simulation chart.')

  var container = document.getElementById('chart-container')
  var data = {
    labels: Object.keys(index.memories).map(function (key) {
      var unallocated = index.memories[key]._unallocated.length
      var allocated = index.memories[key].frames.reduce(function (accumulator, frame) {
        return accumulator + frame.pages.length
      }, 0)
      return index.tags[key] + ' [' + allocated + '/' + (allocated + unallocated) + ']'
    }),
    datasets: []
  }

  // Use the first memory as the base (since they all will have the same frames)
  var base = index.memories[Object.keys(index.memories)[0]]
  for (var i = 0; i < base.frames.length; i++) {
    if (base.frames[i]._unavailable) {
      data.datasets.push({
        label: 'F' + i + ' ' + base.frames[i].size + ' - Unavailable',
        data: Object.keys(index.memories).map(function (key) {
          return index.memories[key].frames[i].size
        }),
        backgroundColor: '#dce2e6'
      })
    } else {
      data.datasets.push({
        label: 'F' + i + ' ' + base.frames[i].size + ' - Allocated',
        data: Object.keys(index.memories).map(function (key) {
          return index.memories[key].frames[i].allocated
        }),
        backgroundColor: '#D9E8FB'
      }, {
        label: 'F' + i + ' ' + base.frames[i].size + ' - Free',
        data: Object.keys(index.memories).map(function (key) {
          return index.memories[key].frames[i].free
        }),
        backgroundColor: '#FFFFFF'
      })
    }
  }

  var canvas = document.createElement('canvas')

  Chart.defaults.global.defaultFontFamily = 'BlinkMacSystemFont, -apple-system, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
  Chart.defaults.global.defaultFontSize = 16
  Chart.defaults.global.elements.rectangle.borderWidth = 1
  var chart = new Chart(canvas, { // eslint-disable-line no-unused-vars
    type: 'bar',
    data: data,
    options: {
      title: {
        display: true,
        text: 'Memory Paging Simulation'
      },
      responsive: true,
      maintainAspectRatio: false,
      onResize: function (chart, size) {
        var height = Math.ceil(size.width * (base.frames.length / 10))
        chart.canvas.parentNode.style.height = height + 'px'
      },
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          stacked: true
        }],
        yAxes: [{
          stacked: true
        }]
      }
    }
  })

  container.innerHTML = ''
  container.appendChild(canvas)

  var memlog = document.getElementById('memlog')
  var memlogs = []

  Object.keys(index.memories)
    .map(function (key) { return index.memories[key] })
    .forEach(function (memory) { memlogs = memlogs.concat(memory._logs) })

  memlog.value = memlogs.join('\n')
}

index.simulate = function () {
  var inputs = index.parseInputs()
  var checkboxes = index.parseCheckboxes()

  if (!inputs || !checkboxes) { return }

  index.memories = {}
  index.allocateHalfIndexes = []

  var some = false
  for (var key in checkboxes) {
    if (checkboxes[key]) {
      index[key](inputs.pages, inputs.frames)
      some = true
    }
  }

  if (!some) {
    return alert('Anda harus mengaktifkan salah satu algoritma.')
  }

  index.drawChartJS()
}
