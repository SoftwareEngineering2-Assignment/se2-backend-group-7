const express = require('express');
const mongoose = require('mongoose');
const {authorization} = require('../middlewares');

const router = express.Router();

const Source = require('../models/source'); // Importing source Model

// Retrieve all sources belonging to the authenticated user
router.get('/sources', authorization, async (req, res, next) => {
  try {
    const {id} = req.decoded; // Get the user's id from the decoded token
    // Find all sources where the owner is the authenticated user
    const foundSources = await Source.find({owner: mongoose.Types.ObjectId(id)});
    const sources = [];
    // Create a new object for each found source
    foundSources.forEach((s) => {
      sources.push({
        id: s._id,
        name: s.name,
        type: s.type,
        url: s.url,
        login: s.login,
        passcode: s.passcode,
        vhost: s.vhost,
        active: false,
      });
    });

    return res.json({
      success: true,
      sources,
    });
  } catch (err) {
    return next(err.body);
  }
});

// Create a new source belonging to the authenticated user
router.post('/create-source', authorization, async (req, res, next) => {
  try {
    const {name, type, url, login, passcode, vhost} = req.body;
    const {id} = req.decoded; // Get the user's id from the decoded token
    // Check if a source with the same name already exists for the authenticated user
    const foundSource = await Source.findOne({
      owner: mongoose.Types.ObjectId(id),
      name,
    });
    if (foundSource) {
      return res.json({
        status: 409,
        message: 'A source with that name already exists.',
      });
    }
    // Create and save a new source object
    await new Source({
      name,
      type,
      url,
      login,
      passcode,
      vhost,
      owner: mongoose.Types.ObjectId(id),
    }).save();

    return res.json({success: true});
  } catch (err) {
    return next(err.body);
  }
});

// Update a source of the authenticated user
router.post('/change-source', authorization, async (req, res, next) => {
  try {
    const {id, name, type, url, login, passcode, vhost} = req.body;
    // Find a source where the _id is the one passed in the request
    // and the owner is the authenticated user
    const foundSource = await Source.findOne({
      _id: mongoose.Types.ObjectId(id),
      owner: mongoose.Types.ObjectId(req.decoded.id),
    });
    // If the source is not found
    if (!foundSource) {
      return res.json({
        status: 409,
        message: 'The selected source has not been found.',
      });
    }
    // Check if a source with the same name already exists for the authenticated user
    const sameNameSources = await Source.findOne({
      _id: {$ne: mongoose.Types.ObjectId(id)},
      owner: mongoose.Types.ObjectId(req.decoded.id),
      name,
    });
    if (sameNameSources) {
      return res.json({
        status: 409,
        message: 'A source with the same name has been found.',
      });
    }

    // Update the source with the new values
    foundSource.name = name;
    foundSource.type = type;
    foundSource.url = url;
    foundSource.login = login;
    foundSource.passcode = passcode;
    foundSource.vhost = vhost;
    // Save the updated source
    await foundSource.save();

    return res.json({success: true});
  } catch (err) {
    return next(err.body);
  }
});

// Delete a source of the authenticated user
router.post('/delete-source', authorization, async (req, res, next) => {
  try {
    const {id} = req.body;

    // Find and remove a source where the _id is the one passed in the request
    // and the owner is the authenticated user
    const foundSource = await Source.findOneAndRemove({
      _id: mongoose.Types.ObjectId(id),
      owner: mongoose.Types.ObjectId(req.decoded.id),
    });
    if (!foundSource) {
      return res.json({
        status: 409,
        message: 'The selected source has not been found.',
      });
    }
    return res.json({success: true});
  } catch (err) {
    return next(err.body);
  }
});

// Retrieve a source's details

router.post('/source', async (req, res, next) => {
  try {
    // Get the name, owner, and user from the request body
    const {name, owner, user} = req.body;
    // Determine the user id based on whether the owner is "self" or a specific user id
    const userId = owner === 'self' ? user.id : owner;
    // Find a source with the provided name and owner id
    const foundSource = await Source.findOne({
      name,
      owner: mongoose.Types.ObjectId(userId),
    });
    if (!foundSource) {
      // If the source is not found, return an error message
      return res.json({
        status: 409,
        message: 'The selected source has not been found.',
      });
    }
    // Create an object to hold the source information
    const source = {};
    source.type = foundSource.type;
    source.url = foundSource.url;
    source.login = foundSource.login;
    source.passcode = foundSource.passcode;
    source.vhost = foundSource.vhost;

    // Return the source information in the response
    return res.json({
      success: true,
      source,
    });
  } catch (err) {
    return next(err.body);
  }
});

router.post('/check-sources', authorization, async (req, res, next) => {
  try {
    // Get the sources from the request body
    const {sources} = req.body;
    // Get the id of the authenticated user
    const {id} = req.decoded;
    // Aray to store new sources.
    const newSources = [];

    // Loop through the provided sources
    for (let i = 0; i < sources.length; i += 1) {
      // Check if a source with the same name and owner id already exists in the database
      // eslint-disable-next-line no-await-in-loop
      const result = await Source.findOne({
        name: sources[i],
        owner: mongoose.Types.ObjectId(id),
      });
      if (!result) {
        // If the source does not already exist, add it to the newSources array
        newSources.push(sources[i]);
      }
    }
    // Loop through the new sources array
    for (let i = 0; i < newSources.length; i += 1) {
      // Create a new source with the name, type, url, login, passcode, vhost, and owner

      // eslint-disable-next-line no-await-in-loop
      await new Source({
        name: newSources[i],
        type: 'stomp',
        url: '',
        login: '',
        passcode: '',
        vhost: '',
        owner: mongoose.Types.ObjectId(id),
      }).save();
    }
    // Return the source information in the response
    return res.json({
      success: true,
      newSources,
    });
  } catch (err) {
    return next(err.body);
  }
});

module.exports = router;
