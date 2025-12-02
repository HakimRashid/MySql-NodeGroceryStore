const express = require('express');
const router = express.Router();

// Rendering the main page
router.get('/', function (req, res) {
    let username = false;
    
    // TODO: Display user name that is logged in (or nothing if not logged in)
    if (req.session && req.session.authenticatedUser) {
        const user = req.session.authenticatedUser;
        username = `${user.firstName} ${user.lastName}`; // Made it display only "Welcome!"" if no user is logged in.
    }
	
    res.render('index', {
        title: "DanHak Grocery Main Page",
        username: username
        // HINT: Look at the /views/index.handlebars file
        // to get an idea of how the index page is being rendered
    });
})

module.exports = router;
