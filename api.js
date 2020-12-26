const express = require('express');
const sudoku = require('sudoku');
const {Router} = express;

const api = Router();

api.get('/generate', async (req, res)=>{
    const puzzle = sudoku.makepuzzle();
    const difficulty = sudoku.ratepuzzle(puzzle);
    res.json({board: puzzle, difficulty});
})

 module.exports = api;