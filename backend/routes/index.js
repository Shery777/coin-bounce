const express = require('express');
const authController = require('../controller/authController');
const blogController = require('../controller/blogController');
const commentController = require('../controller/commentController');
const router = express.Router();
const auth = require('../middleware/auth');

//user

// register
router.post('/register', authController.register);
// login
router.post('/login', authController.login);
// logout
router.post('/logout', auth, authController.logout);
// refresh
router.get('/refresh', authController.refresh);

// blog

// create blog
router.post('/blog', auth, blogController.create);
// get all
router.get('/blog/all', auth, blogController.getAll);
// get all by id
router.get('/blog/:id', auth, blogController.getById);
// update blog
router.put('/blog', auth, blogController.update);
// delete blog
router.delete('/blog/:id', auth, blogController.delete);

// comment
// create
router.post('/comment', auth, commentController.create);
// get
router.get('/comment/:id', auth, commentController.getById);


module.exports = router;
