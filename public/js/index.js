/* global Chart, swal */

'use strict'

/* Prototypes */

var Memory = function (frames) {
  this.frames = frames.map(function (frame) {
    return new Frame(frame)
  })
  this.data = {}
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
  this._unavailable = false // currently unused
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

/* Implementations */

var index = {
  algs: {
    firstFit: {
      tag: 'First Fit',
      memory: null,
      chart: null,
      insert: function (page) {
        var frame
        for (var i = 0; i < this.memory.frames.length; i++) {
          frame = this.memory.frames[i]
          if (frame._unavailable) { continue }
          if (frame.free >= page) {
            frame.pages.push(page)
            return i
          }
        }
      }
    },
    nextFit: {
      tag: 'Next Fit',
      memory: null,
      chart: null,
      insert: function (page) {
        if (this.memory.data.last === undefined) {
          this.memory.data.last = 0
        }
        var j, frame
        for (var i = 0; i < this.memory.frames.length; i++) {
          j = (i + this.memory.data.last) % this.memory.frames.length
          frame = this.memory.frames[j]
          if (frame._unavailable) { continue }
          if (frame.free >= page) {
            frame.pages.push(page)
            this.memory.data.last = j
            return j
          }
        }
      }
    },
    bestFit: {
      tag: 'Best Fit',
      memory: null,
      chart: null,
      insert: function (page) {
        var last, frame
        for (var i = 0; i < this.memory.frames.length; i++) {
          frame = this.memory.frames[i]
          if (frame._unavailable) { continue }
          if (frame.free >= page) {
            if (last !== undefined) {
              if (frame.free < this.memory.frames[last].free) {
                last = i
              }
            } else {
              last = i
            }
          }
        }
        if (last !== undefined) {
          this.memory.frames[last].pages.push(page)
          return last
        }
      }
    },
    worstFit: {
      tag: 'Worst Fit',
      memory: null,
      chart: null,
      insert: function (page) {
        var last, frame
        for (var i = 0; i < this.memory.frames.length; i++) {
          frame = this.memory.frames[i]
          if (frame._unavailable) { continue }
          if (frame.free >= page) {
            if (last !== undefined) {
              if (frame.free > this.memory.frames[last].free) {
                last = i
              }
            } else {
              last = i
            }
          }
        }
        if (last !== undefined) {
          this.memory.frames[last].pages.push(page)
          return last
        }
      }
    },
    quickFit: {
      tag: 'Quick Fit',
      memory: null,
      chart: null,
      insert: function () {
        // TODO:
      }
    }
  }
}


index.updateChart = function (key, animdur) {
  var chart = index.algs[key].chart
  if (!chart) { return }

  chart.data.labels = ['']
  chart.data.datasets = []

  var display = 'none'
  var memory = index.algs[key].memory
  if (memory) {
    display = 'block'
    memory.frames.forEach(function (frame, i) {
      chart.data.datasets.push({
        label: ' F' + (i + 1) + ' terisi',
        data: [frame.allocated],
        backgroundColor: '#DBF3F3',
        borderColor: '#4BC0C0'
      })
      chart.data.datasets.push({
        label: ' F' + (i + 1) + ' kosong',
        data: [frame.free],
        backgroundColor: '#D6ECFB',
        borderColor: '#36A2EB'
      })
    })
  }

  chart.canvas.parentNode.parentNode.style.display = display
  chart.update(animdur)
}

index.notify = function (notify, message, type) {
  notify.className = 'notification ' + (type || '')
  notify.getElementsByTagName('div')[0].innerHTML = message
  notify.style.display = 'block'
}

index.unnotify = function (element) {
  element.parentNode.style.display = 'none'
  element.parentNode.getElementsByTagName('div')[0].innerHTML = ''
}

index.page = function () {
  var page = parseInt(document.getElementById('page').value)

  if (isNaN(page) || page < 1) {
    return swal('Error!', 'Ukuran page tidak boleh kurang dari SATU.', 'error')
  }

  Object.keys(index.algs).forEach(function (key) {
    if (!index.algs[key].memory) { return }
    var frame = index.algs[key].insert(page)
    if (frame !== undefined) {
      index.notify(index.algs[key].notify, 'Page ditambahkan ke frame ke-<strong>' + (frame + 1) + '</strong>.')
    } else {
      index.notify(index.algs[key].notify, 'Page tidak dapat ditambahkan.', 'is-danger')
    }
    index.updateChart(key, 0) // set animation's duration to 0
  })
}

index.init = function () {
  var frames = document.getElementById('frames').value
    .split(',')
    .map(function (i) { return parseInt(i) })

  if (frames.filter(function (frame) { return isNaN(frame) }).length) {
    return swal('Error!', 'Ada input frame yang tidak valid.', 'error')
  }

  var some = false
  Object.keys(index.algs).forEach(function (key) {
    var checkbox = document.getElementById(key)
    if (checkbox && checkbox.checked) {
      index.algs[key].memory = new Memory(frames)
      some = true
    } else {
      index.algs[key].memory = null
    }
  })

  if (!some) {
    return swal('Error!', 'Anda harus mengaktifkan salah satu algoritma.', 'error')
  }

  Object.keys(index.algs).forEach(function (key) {
    index.updateChart(key, 800) // set animation's duration to 800 ms
  })

  document.getElementById('btn_reset').removeAttribute('disabled')
  document.getElementById('btn_page').removeAttribute('disabled')
}

index.reset = function () {
  Object.keys(index.algs).forEach(function (key) {
    index.algs[key].chart.data = {
      labels: [],
      datasets: []
    }
    index.algs[key].chart.update()
    index.algs[key].notify.style.display = 'none'
    index.algs[key].notify.getElementsByTagName('div')[0].innerHTML = ''
  })
  document.getElementById('btn_reset').setAttribute('disabled', 'disabled')
  document.getElementById('btn_page').setAttribute('disabled', 'disabled')
}

index.createCanvas = function (title) {
  var field = document.createElement('div')
  field.className = 'field'
  field.innerHTML =
    '<div class="label">' + title + ':</div>' +
      '<div class="control" style="min-height: 150px">' +
        '<canvas></canvas>' +
      '</div>' +
      '<div class="control">' +
        '<div class="notification" style="display: none">' +
          '<button class="delete" onclick="index.unnotify(this)"></button>' +
          '<div></div>' +
        '</div>' +
      '</div>'
    '</div>'

  var canvas = field.getElementsByTagName('canvas')[0]
  var notify = field.getElementsByClassName('notification')[0]
  return {
    field: field,
    chart: new Chart(canvas, {
      type: 'horizontalBar',
      options: {
        title: {
          display: false
        },
        legend: {
          display: false
        },
        tooltips: {
          mode: 'nearest'
        },
        scales: {
          xAxes: [{
            stacked: true,
            display: false
          }],
          yAxes: [{
            stacked: true,
            ticks: {
              beginAtZero: true
            }
          }]
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: function (context) {
              return context.dataset.data[context.dataIndex] > 0
            }
          }
        }
      }
    }),
    notify: notify
  }
}

window.onload = function () {
  index.container = document.getElementById('chart-container')
  index.container.innerHTML = ''

  Chart.defaults.global.defaultFontFamily = 'BlinkMacSystemFont, -apple-system, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
  Chart.defaults.global.defaultFontSize = 16
  Chart.defaults.global.elements.rectangle.borderWidth = 1

  Object.keys(index.algs).forEach(function (key) {
    var result = index.createCanvas(index.algs[key].tag)
    index.algs[key].chart = result.chart
    index.algs[key].notify = result.notify
    index.container.appendChild(result.field)
  })

  /* Disable quick fit algorithm */
  var quickFit = document.getElementById('quickFit')
  quickFit.checked = false
  quickFit.addEventListener('click', function () {
    swal('Error!', 'Algoritma ini masih belum tersedia.', 'error')
    this.checked = false
  })
}
