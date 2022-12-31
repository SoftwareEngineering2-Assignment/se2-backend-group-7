/* eslint-disable max-len */
const express = require('express');
const mongoose = require('mongoose');
const {authorization} = require('../middlewares');

const router = express.Router();
const Dashboard = require('../models/dashboard');
const Source = require('../models/source');

// Route GET all dashboards of a user 
router.get('/dashboards',
  authorization,
  async (req, res, next) => {
    try {
      // Find dasboards for the user with id provided.
      const {id} = req.decoded;
      const foundDashboards = await Dashboard.find({owner: mongoose.Types.ObjectId(id)});
      // Fill dashboards array with id, name, views of each dashboard
      const dashboards = [];
      foundDashboards.forEach((s) => {
        dashboards.push({
          id: s._id,
          name: s.name,
          views: s.views
        });
      });
      // Return a json file with dashboards array and a success flag.
      return res.json({
        success: true,
        dashboards
      });
      // If something goes wrong, handle it.
    } catch (err) {
      return next(err.body);
    }
  });

// Route POST for creating a new dasboard. 
router.post('/create-dashboard', 
  authorization,
  async (req, res) => {
    try {
      // Check if the user already has a dashboard with that name.
      const {name} = req.body;
      const {id} = req.decoded;
      const foundDashboard = await Dashboard.findOne({owner: mongoose.Types.ObjectId(id), name});
      // If yes, inform them by throwing an error.
      if (foundDashboard) {
        throw new Error('A dashboard with that name already exists.');
      }
      // If no, create an empty dashboard for the user with the name given
      await new Dashboard({
        name,
        layout: [],
        items: {},
        nextId: 1,
        owner: mongoose.Types.ObjectId(id)
      }).save();
      // Return a success flag.
      return res.json({success: true});
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message
      }); 
    }
  }); 

// Route for deleting a dashboard
router.post('/delete-dashboard', 
  authorization,
  async (req, res) => {
    try {
      // Find and remove the requested dashboard for the user if dashboard exists.
      const {id} = req.body;
      const foundDashboard = await Dashboard.findOneAndRemove({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      // If doesn't exist throw an error.
      if (!foundDashboard) {
        throw new Error('The selected dashboard has not been found.');
      }
      // Return a success flag.
      return res.json({success: true});
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message
      }); 
    }
  }); 

// Route for getting all info for a dashboard.
router.get('/dashboard',
  authorization,
  async (req, res) => {
    try {
      // Find the dashboard with the id given as a query.
      const {id} = req.query;
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)});
      // If doesn't exist throw an error.
      if (!foundDashboard) {
        throw new Error('The selected dashboard has not been found.');
      }
      // Create a variable with the info we need for the dashboard.
      const dashboard = {};
      dashboard.id = foundDashboard._id;
      dashboard.name = foundDashboard.name;
      dashboard.layout = foundDashboard.layout;
      dashboard.items = foundDashboard.items;
      dashboard.nextId = foundDashboard.nextId;
      // Find the sources of the user.
      const foundSources = await Source.find({owner: mongoose.Types.ObjectId(req.decoded.id)});
      // Array that contains the names of the sources found.
      const sources = [];
      foundSources.forEach((s) => {
        sources.push(s.name);
      });
      
      // Return a json with the info about the dashboards and the sources
      return res.json({
        success: true,
        dashboard,
        sources
      });
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message
      }); 
    }
  });

// Route to save changes on a dashboard. 
router.post('/save-dashboard', 
  authorization,
  async (req, res) => {
    try {
      // Find and update the dashboard with the given id with new layout, items and nextId
      const {id, layout, items, nextId} = req.body;
      const result = await Dashboard.findOneAndUpdate({_id: mongoose.Types.ObjectId(id), owner: mongoose.Types.ObjectId(req.decoded.id)}, {
        $set: {
          layout,
          items,
          nextId
        }
      }, {new: true});
      // If dashboard doesn't exist throw an error.
      if (result === null) {
        throw new Error('The selected dashboard has not been found.');
      }
      // Return that the update was successful
      return res.json({success: true});
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message,
      });
    }
  }); 

// Route for cloning a dashboard.
router.post('/clone-dashboard', 
  authorization,
  async (req, res) => {
    try {
      const {dashboardId, name} = req.body;
      // Search if the user already have a dashboard with the same name.
      const foundDashboard = await Dashboard.findOne({owner: mongoose.Types.ObjectId(req.decoded.id), name});
      // If yes, throw an error.
      if (foundDashboard) {
        throw new Error('A dashboard with that name already exists.');
      }
      // Find the dashboard to clone with the id given.
      const oldDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId), owner: mongoose.Types.ObjectId(req.decoded.id)});
      // Create the new dashboard by copying info of the old one and setting the new name.
      await new Dashboard({
        name,
        layout: oldDashboard.layout,
        items: oldDashboard.items,
        nextId: oldDashboard.nextId,
        owner: mongoose.Types.ObjectId(req.decoded.id)
      }).save();
      // Return that the clone was successful
      return res.json({success: true});
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message,
      });
    }
  }); 

/* 
 Route for checking conditions about showing a dashboard or not 
 The cases are: a) The user that wants to view the dashboard is the owner of the dashboard
                b) The user is not the owner and the dashboard is not shared (shared : false)
                c) The user is not the owner, dashboard is shared and has no password
                d) The user is not the owner, dashboard is shared and has password      
 Only in case a, c the user is able to view the dashboard 
 */
router.post('/check-password-needed', 
  async (req, res) => {
    try {
      const {user, dashboardId} = req.body;
      const userId = user._id;
      // Find the dashboard with the id given as a query, also return and the password of the dashboard
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId)}).select('+password');
      // If doesn't exist trhow an error.
      if (!foundDashboard) {
        throw new Error('The specified dashboard has not been found.');
      }
      // Take the info we need about the dashboard(name, layout, items).
      const dashboard = {};
      dashboard.name = foundDashboard.name;
      dashboard.layout = foundDashboard.layout;
      dashboard.items = foundDashboard.items;

      // Check for case a).
      if (userId && foundDashboard.owner.equals(userId)) {
        // Update the views counter
        foundDashboard.views += 1;
        await foundDashboard.save();
        // Return a json with the dashboard and that the owner is the user.
        return res.json({
          success: true,
          owner: 'self',
          shared: foundDashboard.shared,
          hasPassword: foundDashboard.password !== null,
          dashboard
        });
      } 
      // Check for case b).
      if (!(foundDashboard.shared)) {
        // Return a json that says the dashboard cannot be shared.
        return res.json({
          success: true,
          owner: '',
          shared: false
        });
      }
      // Check for case c).
      if (foundDashboard.password === null) {
        // Update the views counter
        foundDashboard.views += 1;
        await foundDashboard.save();
        // Return a json with the dashboard, the id of the owner 
        // and flags that dashboard is shared and has no password
        return res.json({
          success: true,
          owner: foundDashboard.owner,
          shared: true,
          passwordNeeded: false,
          dashboard
        });
      }
      // If everything else fails, we are on case d).
      // Return a json that says the dashboard can be shared but has password.
      return res.json({
        success: true,
        owner: '',
        shared: true,
        passwordNeeded: true
      });
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message,
      });
    }
  }); 

// Route for checking if the password provided for the dashboard is correct.
router.post('/check-password', 
  async (req, res) => {
    try {
      const {dashboardId, password} = req.body;
      // Find the dashboard from the id given, also return and the password of the dashboard
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId)}).select('+password');

      // If doesn't exist  throw an error.
      if (!foundDashboard) {
        throw new Error('The specified dashboard has not been found.');
      }
      // If the password is wrong return a json file with true success flag and a flag that indicates that the password is wrong.
      if (!foundDashboard.comparePassword(password, foundDashboard.password)) {
        return res.json({
          success: true,
          correctPassword: false
        });
      }
      // If everything is fine update the views of the dashboard (+1).
      foundDashboard.views += 1;
      await foundDashboard.save();

      // A 'minimal' dashboard that contains name, layout and items of the dashboard
      const dashboard = {};
      dashboard.name = foundDashboard.name;
      dashboard.layout = foundDashboard.layout;
      dashboard.items = foundDashboard.items;
      // Return a json with info that everything is okay and with the 'minimal' dashboard  
      return res.json({
        success: true,
        correctPassword: true,
        owner: foundDashboard.owner,
        dashboard
      });
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message,
      });
    }
  }); 

// Route for changing the share status of a dashboard
router.post('/share-dashboard', 
  authorization,
  async (req, res) => {
    try {
      // Find the dashboard with the given id of the user
      const {dashboardId} = req.body;
      const {id} = req.decoded;
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId), owner: mongoose.Types.ObjectId(id)});
      // If doesn't exist  throw an error.
      if (!foundDashboard) {
        throw new Error('The specified dashboard has not been found.');
      }
      // Change the share status of the dashboard (true -> false, false -> true)
      foundDashboard.shared = !(foundDashboard.shared);
      await foundDashboard.save();
      // Return a json that the change was successful and the knew shared status
      return res.json({
        success: true,
        shared: foundDashboard.shared
      });
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message,
      });
    }
  }); 

// Route to change the password of a dashboard
router.post('/change-password', 
  authorization,
  async (req, res) => {
    try {
      // Find the dashboard with the given id of the user
      const {dashboardId, password} = req.body;
      const {id} = req.decoded;
      const foundDashboard = await Dashboard.findOne({_id: mongoose.Types.ObjectId(dashboardId), owner: mongoose.Types.ObjectId(id)});
      // If doesn't exist  throw an error.
      if (!foundDashboard) {
        throw new Error('The specified dashboard has not been found.');
      }
      // Change the password.
      foundDashboard.password = password;
      await foundDashboard.save();
      // Return that the post was successful
      return res.json({success: true});
      // Catch the error and return a json file with status code and the message of error.
    } catch (err) {
      return res.json({
        status: 409,
        message: err.message,
      });
    }
  }); 

module.exports = router;
