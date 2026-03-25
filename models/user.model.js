const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        hashedPassword: {
            type: String,
            required: false,
        },
        phone: {
            type: String,
            trim: true,
            default: null,
        },
        avatarURL: {
            type: String,
            trim: true,
            default: null,
        },
        hashedRefreshToken: {
            type: String,
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        versionKey: false,
    }
);

module.exports = mongoose.model('User', userSchema);