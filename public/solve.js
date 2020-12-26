export default function* solve(puzzle, guess = null) {
    let grid = yield* copy(puzzle)
    if (guess) grid[guess.cell].num = guess.num;
    yield {grid, cell: null};
    let didReduce = false;
    try {
        do {
            console.log(grid.toString());
            didReduce = false;
            const changed = new Set();
            for(let cell of grid) {
                if (!cell.num) {
                    yield {grid, cell};
                    if (cell.notes.length == 0) throw new PuzzleError(`cell r: ${cell.y}, c: ${cell.x} is invalid.`, cell)
                    if (cell.notes.length == 1) {
                        cell.num = cell.notes[0];
                        cell.notes.length = 0;
                        didReduce = true;
                        console.log(`Reduced ${cell} by single to ${cell.num}.`);
                        changed.add(cell)
                        yield* filterNotes(grid, false);
                        yield {grid, cell}
                    } else {
                        let unique = new Set();
                        for (let note of cell.notes) {
                            if (!cell.col.some(c=>!c.num&&c !== cell&&c.notes.includes(note))) unique.add(note);
                            if (!cell.row.some(c=>!c.num&&c !== cell&&c.notes.includes(note))) unique.add(note);
                            if (!cell.box.some(c=>!c.num&&c !== cell&&c.notes.includes(note))) unique.add(note);
                        }
                        if (unique.size == 1) {
                            cell.num = [...unique][0];
                            cell.notes.length = 0;
                            didReduce = true;
                            console.log(`Reduced ${cell} by unique to ${cell.num}.`);
                            changed.add(cell)
                            yield* filterNotes(grid, false);
                            yield {grid, cell}
                        } else if (unique.size > 1) {
                            throw new PuzzleError(`Found cell that must contain more than one value. Row: ${cell.x}, Col: ${cell.y}, needs: ${unique}`, cell)
                        }
                    }
                }
            }
            yield {grid, cell: null}
            yield* filterNotes(grid)
            yield {grid, cell: null}
        } while (didReduce);
    } catch (e) {
        if (e instanceof PuzzleError) {
            yield {grid, cell: e.cell, error: true};
            return null;
        }
        throw e;
    }
    console.log(`Reduced as far as possible:${grid.toString()}\nHave to guess.`);
    if (solved(grid)) return grid;
    const guesses = grid.reduce((res,cell) => !cell.num?res.concat(cell.notes.map(note=>({cell: cell.i, num: note, sort: cell.notes.length}))):res, []).sort((a, b)=>Math.sign(a.sort - b.sort) * 2 + Math.sign(a.cell - b.cell));
    // return (solved(grid)?grid:guesses.find(guess=>solve(grid, guess)));
    for (let guess of guesses) {
        let res = solve(grid, guess);
        if (res) return res;
    }
    return null;
}

class PuzzleError extends Error {
    constructor(msg, cell) {
        super(message);
        this.cell = cell;
    }
};

function* copy(puzzle) {
    let grid = Array.from({length: 81}, (_, i)=>{
        const cell = {num: (puzzle[i]?puzzle[i]|0:null), row: [], col: [], box: [], y: (i / 9) | 0, x: i % 9, z: (((i/9)|0) / 3 | 0) * 3 + (((i%9)/3)|0), i};
        cell.toString = ()=>`Cell[${cell.num?cell.num:' '}]{r: ${cell.y}, c: ${cell.x}}`
        return cell;
    })
    grid.toString = ()=> grid.reduce((res, cell, i)=>{
            return res + (i % 9 == 0?((i / 9| 0) % 3 == 0?'\n─── ─── ─── ─── ─── ─── ─── ─── ───\n ':'\n┄┄┄ ┄┄┄ ┄┄┄ ┄┄┄ ┄┄┄ ┄┄┄ ┄┄┄ ┄┄┄ ┄┄┄\n '):(i % 3 == 0?' │ ':' ┆ ')) + (cell.num?cell.num:' ');
        }, '')
        
    grid.rows = Array.from({length: 9}, _=>[]);
    grid.cols = Array.from({length: 9}, _=>[]);
    grid.boxes = Array.from({length: 9}, _=>[]);
    grid.groups = [...grid.rows, ...grid.cols, ...grid.boxes]
    for (let cell of grid) {
        cell.row = Array.from({length: 9}, (_,j)=>grid[cell.y * 9 + j]);
        cell.col = Array.from({length: 9}, (_,j)=>grid[cell.x + j * 9]);
        cell.box = Array.from({length: 9}, (_,j)=>{
            // console.log();
            return grid[(cell.z / 3 | 0) * 27 + (cell.z % 3) * 3 + (j / 3 | 0) * 9 + j % 3]
        });
        grid.rows[cell.y].push(cell);
        grid.cols[cell.x].push(cell);
        grid.boxes[cell.z].push(cell);
        console.log(cell);
        cell.notes = Array.from({length: 9}, (_,num)=>num + 1);
    }
    yield* filterNotes(grid);
    return grid;
}


function* filterNotes(grid, advanced = true) {
    
    
    for (let cell of grid) {
        cell.notes = cell.notes.filter(num=>{
            return !cell.num && cell.row.every(c=>c.num != num) &&
                   cell.col.every(c=>c.num != num) &&
                   cell.box.every(c=>c.num != num)
        });
    }
    yield {grid, cell: null};
    let changesMade = false;
    if (advanced) do {
        changesMade = false;
        /*
        TODO:
        [ ] If a group contains n cells where n > 1 with n identical notes that are unique to those cells,
            those cells cannot contain any other notes.
        */
        // for (let group of grid.groups) {
        //     const groups = new Map();
        //     for (let cell of group) {
        //         for (let note of cell.notes) {
        //             if (!groups.has(note)) groups.set(note, {notes: [note], cells: new Set([cell])})
        //         }
        //     }
        // }

        /*
        TODO:
        [ ] If a group has a set of n cells have n identical notes then no other cells in that group can have those notes.
        */
        for (let group of grid.groups) {
            const groups = new Map()
            for (let cell of group) {
                if (cell.num) continue;
                const ns = noteString(cell.notes);
                if (!groups.has(ns)) groups.set(ns, new Set())
                groups.get(ns).add(cell);
            }
            for (let [ns, ngroup] of groups) if (ngroup.size == ns.length) {
                for (let c of group) if (!ngroup.has(c)) {
                    yield {grid, cell: c};
                    c.notes = c.notes.filter(note=>{
                        if (ns.indexOf(note) >= 0) {
                            changesMade = true;
                            return false;
                        }
                        return true;
                    })
                };
            }
        }
        yield {grid, cell: null}
    } while (changesMade);
}

function noteString(notes) {
    return notes.join();
}


function solved(grid) {
    for (let group in grid.groups) {
        const needed = new Set(Array.from({length: 9}, (_,i)=>i+1));
        for (let cell in group) if (!cell.num) {return false} else needed.delete(cell.num);
        if (needed.size > 0) return false; 
    }
    return true;
}