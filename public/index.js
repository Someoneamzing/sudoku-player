import handyDOM from './handyDOM.js';
import solve from './solve.js';

window.solve = solve;

const elements = handyDOM();

const game = {
    selectedNumber: 1,
    canPlace: false,
    noteMode: false,
}

const cells = Array.from({length: 81}, (_, i)=>{
    const cell = document.createElement('div');
    cell.innerHTML = `<span class="cell-number"></span><div class="notes"><span class="note">1</span><span class="note">2</span><span class="note">3</span><span class="note">4</span><span class="note">5</span><span class="note">6</span><span class="note">7</span><span class="note">8</span><span class="note">9</span></div>`
    cell.classList.add('cell');
    elements.board.append(cell);
    cell.onclick = (e)=>{
        if (!game.canPlace) return;
        if (!cell.classList.contains('locked')) {
            if (game.noteMode) {
                console.log('Making note');
                if (game.selectedNumber && !getNum(i)) {
                    cell.notes[game.selectedNumber-1].classList.toggle('shown');
                } else {
                    for (let note of cell.notes) note.classList.remove('shown');
                }
            } else setCell(cell, game.selectedNumber);
        }
    }
    cell.notes = cell.querySelectorAll('.note');
    cell.notes[box(i)].classList.add('shown')
    cell.num = cell.querySelector('.cell-number')
    return cell;
})

function setCell(i, num, locked = false, shouldValidate = true) {
    const cell = typeof i === 'object'?i:cells[i];
    cell.num.innerHTML = num?num:"&nbsp;";
    cell.classList.toggle('locked', locked);
    cell.classList.remove('error')
    for (let note of cell.notes) note.classList.remove('shown');
    if (shouldValidate) if (validateBoard() && cells.every((cell, i)=>getNum(i))) {
        board.classList.add('won')
    }
    updateHighlight();
}

function getNum(i) {
    return cells[i].num.innerText | 0;
}

function row(index) {
    return (index / 9) | 0;
}

function col(index) {
    return index % 9;
}

function box(index) {
    return (row(index) / 3 | 0) * 3 + (col(index) / 3 | 0);
}

function coord(index) {
    return {row: row(index), col: col(index), box: box(index)};
}

function index(row, col) {
    const {r, c} = typeof row === 'object'?row:{r: row, c: col};
    return r * 9 + c;
}

function emptyTrackSets() {
    return Array.from({length: 9}, _=> new Set());
}

function recordTracker() {
    return {rows: emptyTrackSets(), cols: emptyTrackSets(), boxes: emptyTrackSets()}
}

function validateBoard() {
    const completed = recordTracker();
    const errors = recordTracker();
    let errorFree = true;
    for (let i = 0; i < 9; i ++) {
        for (let j = 0; j < 9; j ++) {
            const ind = index(i, j);
            const cell = cells[ind];
            const b = box(ind);
            const num = getNum(ind);
            // console.log(num);
            if (num) {
                if (completed.rows[i].has(num)) {
                    errors.rows[i].add(num);
                    console.log(`Error on rows`);
                    errorFree = false;
                }
                if (completed.cols[j].has(num)) {
                    errors.cols[j].add(num);
                    console.log(`Error on cols`);
                    errorFree = false;
                }
                if (completed.boxes[b].has(num)) {
                    errors.boxes[b].add(num);
                    console.log(`Error on boxes`);
                    errorFree = false;
                }
                completed.rows[i].add(num)
                completed.cols[j].add(num)
                completed.boxes[b].add(num)
            }
        }
    }
    for (let [i, cell] of cells.entries()) {
        const num = getNum(i);
        if (num && !cell.classList.contains('locked')) {
            const {row, col, box} = coord(i);
            // console.log(`Checking cell: r: ${row}, c: ${col}, b: ${box}, num: ${num} (${typeof num})`);
            if (errors.rows[row].has(num)) cell.classList.add('error');
            if (errors.cols[col].has(num)) cell.classList.add('error');
            if (errors.boxes[box].has(num)) cell.classList.add('error');
        }
    }

    return errorFree;
}

function updateHighlight() {
    for (let [i, cell] of cells.entries()) {
        cell.classList.toggle('highlight', game.selectedNumber && getNum(i) == game.selectedNumber)
    }
}

const numbers = Array.from({length: 9}, (_, i)=>{
    const number = document.createElement('button');
    number.classList.add('number-button');
    if (i == 0) number.classList.add('selected');
    number.innerText = (i|0) + 1;
    number.onclick = (e)=>{
        game.selectedNumber = i + 1;
        elements.erase.classList.remove('selected');
        numbers.forEach(elem=>elem.classList.remove('selected'));
        number.classList.add('selected');
        elements.noteButton.classList.toggle('selected', game.noteMode);
        updateHighlight();
    }
    elements.numbers.append(number);
    return number;
})
elements.noteButton = document.createElement('button');
elements.noteButton.innerText = "✏";
elements.noteButton.classList.add('number-button');
elements.noteButton.id = 'note-button';
elements.numbers.append(elements.noteButton);
elements.noteButton.onclick = e => {
    game.noteMode = !game.noteMode;
    elements.noteButton.classList.toggle('selected', game.noteMode);
}

elements.erase.onclick = e => {
    game.selectedNumber = null;
    numbers.forEach(elem=>elem.classList.remove('selected'));
    elements.erase.classList.add('selected');
    updateHighlight();
}

elements.start.onclick = async e => {
    try {
        const puzzle = await (await fetch('/api/generate')).json();
        console.log(puzzle);
        elements.board.classList.remove('won')
        for (let [i, cell] of puzzle.board.entries()) {
            cells[i].classList.remove('locked');
            if (cell !== null) cell += 1;
            setCell(i, cell, !!cell, false);
        }
        game.canPlace = true;
    } catch (err) {
        console.error(err);
    }

}

let currentSolve = null;

let pauseTimeout = null;
let repeatInterval = null;

elements.debug.onmousedown = e=>{
    runTest();
    pauseTimeout = setTimeout(()=>{
        pauseTimeout = null;
        repeatInterval = setInterval(runTest, 100);
    }, 1000)
}


window.addEventListener('mouseup', e=>{
    if (repeatInterval) clearInterval(repeatInterval);
    if (pauseTimeout) clearTimeout(pauseTimeout);
})


async function runTest(){
    if (!currentSolve) currentSolve = solve((await (await fetch('/api/generate')).json()).board.map(e=>e!==null?e+1:e));
    const {done, value} = currentSolve.next();
    if (!done) {
        const {grid, cell, error} = value || {};
        for (let cell of grid) {
            cells[cell.i].num.innerText = cell.num?cell.num:'';
            cells[cell.i].notes.forEach(note=>note.classList.toggle('shown', cell.notes.includes(note.innerHTML|0)));
            cells[cell.i].classList.remove('debug-target');
            cells[cell.i].classList.remove('debug-secondary');
        }
    
        if (cell) {
            cells[cell.i].classList.add('debug-target');
            for (let s of [...cell.row, ...cell.col, ...cell.box]) cells[s.i].classList.add('debug-secondary')
        }

        if (error) {
            elements.board.classList.add('error');
        }

    }

    if (done) {
        if (value) {
            console.log("Solved");
        } else {
            console.log("Failed to solve");
        }
        validateBoard();
        currentSolve = null;
        clearInterval(repeatInterval);
    }
}