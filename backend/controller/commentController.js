const Joi = require('joi');
const mongodbIdPattern = /^[0-9a-fA-f]{24}$/;
const Comment = require('../models/comment');
const CommentDTO = require('../dto/comment');

const commentController = {
    // 1. comment
    
    async create(req, res, next){
        const createCommentSchema = Joi.object({
            blog: Joi.string().regex(mongodbIdPattern).required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            content: Joi.string().required()
        });

        const {error} = createCommentSchema.validate(req.body);

        if(error){
            return next(error);
        }

        const {blog, author, content} = req.body;

        try {
            const newComment = new Comment({
                blog, author, content
            });
            await newComment.save();
        } catch (error) {
            return next(error);
        }

        return res.status(201).json({message: 'Comment created'})
    },

    // 1. get by id

    async getById(req, res, next){
        const getByIdSchema = Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        });

        const {error} = getByIdSchema.validate(req.params);

        if(error){
            return next(error);
        }

        const {id} = req.params;

        let comments;

        try {
            comments = await Comment.findOne({blog: id}).populate('author');
        } catch (error) {
            return next(error);
        }

        let commentsDto = [];
        for(let i = 0; i < comments.lenght; i++){
            const obj = new CommentDTO(comments[i]);
            commentsDto.push(obj); 
        }
        return res.status(200).json({data: commentsDto});
    },
}

module.exports = commentController;