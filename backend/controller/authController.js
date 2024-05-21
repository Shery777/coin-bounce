const Joi = require('joi');
const User = require('../models/user'); 
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user');
const JWTService = require('../services/JWTServices');
const RefreshToken = require('../models/token');


const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
 
const authController = {

    // 1. register controller

    async register(req, res, next) {
        // 1. Validate user input
        const userRegisterSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().pattern(passwordPattern).required(),
            confirmPassword: Joi.ref('password')
        });


        const {error} = userRegisterSchema.validate(req.body);

        // 2. if error in vallidation -> return error in middleware

        if (error) {
            return next(error);
        } 

        // 3. if email or username is already registered -> return an error

        const {username, name, email, password} = req.body;
        try {
            const emailInUse = await User.exists({email});
            const usernameInUse = await User.exists({username});

            if(emailInUse){
                const error = {
                    status: 409,
                    message: 'Email is already registered, use an other email!'
                }
                return next(error);
            }

            if(usernameInUse){
                const error = {
                    status: 409,
                    message: 'Username is not available, choose another user name'
                }
                return next(error);
            }


        } 
        catch (error) {
            return next(error);
        }

        // 4. password hash

        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. store user data in database
        let accessToken;
        let refreshToken;
        let user;
        try {
            const userToRegister = new User({
                username,
                email,
                name,
                password: hashedPassword
     
            })
    
            user = await userToRegister.save(); 
            // token generation
            accessToken = JWTService.signAccessToken({_id: user._id}, '30m');

            refreshToken = JWTService.signRefreshToken({_id: user._id}, '60m');

        } catch (error) {
                return next(error);
        }

        // store refresh token

        await JWTService.storeRefreshToken(refreshToken, user._id);

        // send token in cookie
        res.cookie('accessToken', accessToken,{
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        });

        res.cookie('refreshToken', refreshToken,{
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        });


        // 6. respond send

        const userDto = new UserDTO(user);
         
        return res.status(200).json({user: userDto, auth: true});
    },

    // 2. login controller

    async login(req, res, next) {
        // 1. validate user input
        const userLoginSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            password: Joi.string().pattern(passwordPattern)
        });

        const {error} = userLoginSchema.validate(req.body);

        //2. return error

        if(error){
            return next(error);
        }

        //3. match username and password

        const {username, password} = req.body;
        let user;
        try {
            // match user
            user = await User.findOne({username: username});

            if(!user){
                const error = {
                    status: 401,
                    message: 'Invalid username'
                }
                return next(error);
            }

            // match password
            const match = await bcrypt.compare(password, user.password);

            if(!match){
                const error = {
                    status: 401,
                    message: 'Invalid password'
                }
                return next(error);
            }

        } catch (error) {
            return next(error);
        }

        const accessToken = JWTService.signAccessToken({_id: user._id}, '30m');
        const refreshToken = JWTService.signRefreshToken({_id: user._id}, '60m');

        // update refresh token in db
        try {
            await RefreshToken.updateOne({
                _id: user._id
            },
            {token: refreshToken},
            {upsert: true}
        );
        } catch (error) {
            return next(error);
        }

        res.cookie('accessToken', accessToken,{
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        });

        res.cookie('refreshToken', refreshToken,{
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        });

        const userDto = new UserDTO(user);
         
        return res.status(200).json({user: userDto, auth: true});
    },

    // 3. logout controller

    async logout(req, res, next){
        // 1. delete refresh token from db
        const {refreshToken} = req.cookies;

        try {
            await RefreshToken.deleteOne({
                token: refreshToken
            });
        } catch (error) {
            return next(error);
        }

        // 2. delete cookie
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        // 3. responce

        res.status(200).json({user: null, auth: false});
    },

    // 4. Refresh Controller
    async refresh(req, res, next){
        // 1. get refreshToken from cookies

        const originalRefreshToken = req.cookies.refreshToken;

        try {
            id =JWTService.verifyRefreshToken(originalRefreshToken)._id;
        } catch (e) {
            const error = {
                status: 401,
                message: 'Unauthorized'
            }
            return next(error);
        }

        // 2. verify token

        try {
            const match = RefreshToken.findOne({_id: id, token: originalRefreshToken});

            if(!match){
                const error = {
                    status: 401,
                    message: 'Unauthorized'
                }
                return next(error);
            }
        } catch (e) {
            return next(e);
        }

        // 3. generate new Token

        try {
            const accessToken = JWTService.signAccessToken({_id: id}, '30m');
            const refreshToken = JWTService.signRefreshToken({_id: id}, '60m');

            await RefreshToken.updateOne({_id: id}, {token: refreshToken});

            res.cookie('accessToken', accessToken,{
                maxAge: 1000 * 60 * 60 * 24,
                httpOnly: true
            });
    
            res.cookie('refreshToken', refreshToken,{
                maxAge: 1000 * 60 * 60 * 24,
                httpOnly: true
            });

        } catch (e) {
            return next(e);
        }
        // 4. update db, return response

        const user = await User.findOne({_id: id});

        const userDto = new UserDTO(user);
        
        return res.status(200).json({user: userDto, auth: true});
    }
 }

 module.exports = authController;