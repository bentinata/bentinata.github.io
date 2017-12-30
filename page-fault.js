'use strict';

function countmap(page, future) {
  const count = page.map((value, index) => {
    return future.reduce((acc, curr) => acc += curr == value ? 1 : 0, 0)
  })

  return count.indexOf(Math.min(...count))
}

function optimal(seq, start) {
  const mem = [];
  if (start) mem.push(start)

  for (let i = mem.length; i < seq.length; i += 1) {
    if (i === 0 && !mem.length) {
      mem.push([seq[i]])
      continue
    }

    const current = mem[i - 1].slice()

    if (current.indexOf(seq[i]) === -1) {
      if (current.length < 4) {
        current.push(seq[i])
      } else {
        const future = seq.slice(i + 1)
        const count = current.map((value, index) => {
          return future.indexOf(value)
        })

        const index = count.indexOf(Math.max(...count))
        current[index] = seq[i]
      }
    }

    mem.push(current)
  }

  return mem;
}
