const Joi = require('joi');
const fs = require('fs');
const {BACKEND_SERVER_PATH} = require('../config/index');
const Blog = require('../models/blog');
const BlogDTO = require('../dto/blog');
const blogDetailsDTO = require('../dto/blog-detail');
const Comment = require('../models/comment');

const mongodbIdPattern = /^[0-9a-fA-f]{24}$/;

const blogController = {
    // 1. Create blog
    async create(req, res, next){
        // 1. Validate req body
        const createBlogSchema = Joi.object({
            title: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            content: Joi.string().required(),
            photo: Joi.string().required()
        })

        const {error} = createBlogSchema.validate(req.body);

        if(error){
            return next(error);
        }

        const {title, author, content, photo} = req.body; 

        // read as buffer

        const buffer = Buffer.from(photo.replace(/^date:image\/(png|jpg|jpeg); base64,/, ''), 'base64');

        // allot a random name

        const imagePath = `${Date.now()}-${author}.png`;

        //save locally

        try {
            fs.writeFileSync(`storage/${imagePath}`, buffer);            
        } catch (error) {
            return next(error);
        }
        
        // save blog in db
        // let = newBlog;

        try {
            newBlog = new Blog({
                title,
                author,
                content,
                photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}` 
            });

            await newBlog.save();
        } catch (error) {
            return next(error);
        }

        const blogDto = new BlogDTO(newBlog);

        return res.status(201).json({blog: blogDto});
        // 2. Handle photo storage, neming
        // 3. add to db
        // 4. return response
    },
    // 2. get all 
    async getAll(req, res, next){
        try {
            const blogs = await Blog.findOne({});

            const blogsDto = [];

            for(let i=0; i < blogs.lenght; i++){
                const dto = new BlogDTO(blogs[i]);
                blogsDto.push(dto);
            }
            return res.status(200).json({blogs: blogsDto});
        } catch (error) {
            return next(error);
        }
    },
    // 3. get all by id
    async getById(req, res, next){
        const getByIdSchema = Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        });
        const {error} = getByIdSchema.validate(req.params);

        if(error){
            return next(error);
        }  

        let blog;

        const {id} = req.params; 

        try {
            blog = await Blog.findOne({_id: id}).populate('author');
        } catch (error) {
            return next(error);
        }

        const blogDto = new blogDetailsDTO(blog);

        return res.status(200).json({blog: blogDto});
    },
    // 4. Update blog
    async update(req, res, next){
        // validate

        const updateBlogSchema = Joi.object({
            title: Joi.string().required(),
            content: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),
            blogId: Joi.string().regex(mongodbIdPattern).required(),
            photo: Joi.string()
        });

        const {error} = updateBlogSchema.validate(req.body);

        if(error){
            return next(error);
        }

        const {title, content, author, blogId, photo} = req.body;

        // delete previous photo
        //save new photo

        let blog;

        try {
            blog = await Blog.findOne({_id: blogId});
        } catch (error) {
            return next(error);
        }

        if(photo){
            previousPhoto = blog.photoPath;

            previousPhoto = previousPhoto.split('/').at(-1);

            // delete photo
            fs.unlinkSync(`storage/${previousPhoto}`);

            // read as buffer

        const buffer = Buffer.from(photo.replace(/^date:image\/(png|jpg|jpeg); base64,/, ''), 'base64');

        // allot a random name

        const imagePath = `${Date.now()}-${author}.png`;

        //save locally

        try {
            fs.writeFileSync(`storage/${imagePath}`, buffer);            
        } catch (error) {
            return next(error);
        }

        await Blog.updateOne({_id: blogId}, {
            title,
            content,
            photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}` 
        });
        } else{
            await Blog.updateOne({_id: blogId}, {title, content});
        }

        return res.status(200).json({message: 'Blog updated!'});

    },
    // 5. Delete blog
    async delete(req, res, next){
        // validate blog
        // delete comment in blog

        const deleteBlogSchema = Joi.object({
            Id: Joi.string().regex(mongodbIdPattern).required(),
        })

        const {error} = deleteBlogSchema.validate(req.params);
        const {id} = req.params; 

        // delete blog

        try {
            await Blog.deleteOne({_id: id});
            await Comment.deleteMany({blog: id});
        } catch (error) {
            return next(error);
        }

        return res.status(200).json({message: 'Blog deleted!'});

    }
}

module.exports = blogController;