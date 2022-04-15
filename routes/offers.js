const express = require("express");

const router = express.Router();
const cloudinary = require("cloudinary").v2;

const Offer = require("../models/Offer");
const User = require("../models/User");
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/create/offer", isAuthenticated, async (req, res) => {
  try {
    let pictureToUpload = req.files.picture.path;
    const result = await cloudinary.uploader.upload(pictureToUpload);
    console.log(result);
    if (req.fields.description.length >= 500) {
      res
        .status(400)
        .json({ message: "Description is limited to 500 characters" });
    } else if (req.fields.title.length >= 50) {
      res.status(400).json({ message: "Title is limited to 50 characters" });
    } else if (req.fields.price >= 100000) {
      res.status(400).json({ message: "Price is limited to 100000" });
    } else {
      const newOffer = new Offer({
        product_name: req.fields.title,
        product_description: req.fields.description,
        product_price: req.fields.price,
        product_details: [
          { Brand: req.fields.brand },
          { Size: req.fields.size },
          { Condition: req.fields.condition },
          { Color: req.fields.color },
          { City: req.fields.city },
        ],
        product_image: result.secure_url,
        owner: req.user,
      });
      await newOffer.save();
      res.json({
        product_name: req.fields.title,
        product_description: req.fields.description,
        product_price: req.fields.price,
        product_details: [
          { MARQUE: req.fields.brand },
          { TAILLE: req.fields.size },
          { ETAT: req.fields.collection },
          { COULEUR: req.fields.color },
          { EMPLACEMENT: req.fields.city },
        ],
        product_image: result.secure_url,
        owner: req.user.account,
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
  } catch (error) {}
  const filtersObject = {};
  if (req.query.title) {
    filtersObject.product_name = RegExp(req.query.title, "i");
  }

  if (req.query.priceMin) {
    filtersObject.product_price = { $gte: req.query.priceMin };
  }

  if (req.query.priceMax) {
    if (filtersObject.product_price) {
      filtersObject.product_price.$lte = req.query.priceMax;
    } else {
      filtersObject.product_price = {
        $lte: req.query.priceMax,
      };
    }
  }
  const sortObject = {};
  if (req.query.sort === "price-desc") {
    sortObject.product_price = "desc";
  } else if (req.query.sort === "price-asc") {
    sortObject.product_price = "asc";
  }

  let limit = 3;
  if (req.query.limit) {
    limit = req.query.limit;
  }
  let page = 1;
  if (req.query.page) {
    page = req.query.page;
  }
  console.log(filtersObject);
  const offers = await Offer.find(filtersObject)
    .sort(sortObject)
    .skip((page - 1) * limit)
    .limit(limit)
    .select("product_name product_price");

  const count = await Offer.countDocuments(filtersObject);
  res.json({ count: count, offers: offers });
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username email -_id",
    });
    res.json(offer);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

module.exports = router;
