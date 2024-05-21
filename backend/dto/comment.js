class CommentDTO{
    constructor(comment){
        this._id = comment._id;
        this.createdAt = comment.createdAt;
        this.authorUsername = comment.author.username;
        this.content = comment.content;
    }
}

module.exports = CommentDTO;