//Import import express from 'express';
// Import required modules
import session from 'express-session'
import express from 'express';
import mysql2 from 'mysql2';
import dotenv from 'dotenv';
// Load the environment variables from .env file
dotenv.config();


// Create a connection pool
const pool = mysql2.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
}).promise();


// Create an instance of an Express application
const app = express();

// Define the port number where our server will listen
const PORT = 3010;

//Enable static file serving
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 *60} //1 hour
}));

const orders = [];

// // Create a route to test the database

app.get('/session-test', (req, res) => {
    req.session.views = (req.session.views || 0) + 1;
    res.send(`Visits: ${req.session.views} <br>
        Logged in : ${req.session.ooggedIn === true}`);
});

//Only let loged-in users through; send everyone else to /login
function requireLogin(req,res, next){
    if(req.session.loggedIn){
        next();
    }else{
        res.redirect('/login');
    }
}





// Define a default "route" ('/')
// req: contains information about the incoming request
// res: allows us to send back a response to the client




app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
 
    const username = req.body.username;
    const password = req.body.password;
 
   
    if (username === process.env.ADMIN_USER &&
        password === process.env.ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/admin');
 
    } else {
        res.render('login', { error: 'Invalid username or password.' });
    }
});

app.get('/', (req, res) => {
res.render(`home`)
// res.send('hello');
});

// Confirmation route - handles form submission
app.post('/confirm', async(req, res) => {

    try {
        // Get form data from req.body
        const order = req.body;  

        order.timestamp = new Date();
   

        // Log the order data (for debugging)
        console.log('New order submitted:', order);

	  // Convert toppings array to comma-separated string 
        order.toppings = Array.isArray(order.toppings) ?
    	  	order.toppings.join(", ") : "";  

        // SQL INSERT query with placeholders to prevent SQL injection
        const sql = `INSERT INTO orders(customer, email,
         flavor, cone, toppings, comment)
          VALUES (?, ?, ?, ?, ?, ?);`;


        // Parameters array must match the order of ? placeholders
	  // Make sure your property names match your order names
        const params = [
        order.customer,
        order.email,
		order.flavor,
		order.cone,
		order.toppings,
        order.comment
        ];


        // Execute the query and grab the primary key of the new row
	  // Array destructuring with [result] gives us the first element
    const [result] = await pool.execute(sql, params);

	  // Add the order ID to the order object
	order.id = result.insertId;
	console.log('Order saved with ID:', order.id);

        // Render confirmation page with the order data
    res.render('confirm', { order });        

    } catch (err) {

        console.error('Error saving order:', err);
        res.status(500).send(`Sorry, there was an error processing 
your order. Please try again.`);
    }
});

// req.session.destroy() deletes the session from the server.
// When it's finished, we send the user back to the login page.
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});


// Display all orders
app.get('/admin', requireLogin, async (req, res) => {
    try {
        // Fetch all orders from database, most recent first
        const [orders] = await pool.query(`SELECT * FROM orders ORDER BY timestamp DESC`);  
        // Render the admin page
        res.render('admin', { orders });        
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('Error loading orders: ' + err.message);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    })
})

// Start the server and listen on the specified port 
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
}); 
