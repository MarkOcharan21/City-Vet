const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/pets");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination(req,file,cb){

        cb(null, uploadDir);

    },

    filename(req,file,cb){

        const extension = path.extname(file.originalname).toLowerCase();

        cb(

            null,

            Date.now() + extension

        );

    }

});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension) && allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(new Error("Only JPG, PNG, and WebP images are allowed."));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;