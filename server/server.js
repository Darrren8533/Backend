const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Set up multer for file uploads with memory storage and size limits
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
      fieldSize: 25 * 1024 * 1024, 
      fileSize: 25 * 1024 * 1024  
  }
});

// Database configuration
const dbConfig = {
  user: 'sa',
  password: 'abc12345',
  server: 'LAPTOP-VV41G823',
  database: 'CAMS',
  options: {
    encrypt: false,
    enableArithAbort: true,
  },
};

// Initialize database connection pool
let pool;
const initDbConnection = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
};
initDbConnection();

// Close database connection pool on server shutdown
process.on('SIGINT', async () => {
  if (pool) {
    try {
      await pool.close();
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing the connection pool:', err);
    }
  }
  process.exit();
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// User registration endpoint
app.post('/register', async (req, res) => {
  const { firstName, lastName, username, password, email } = req.body;

  try {
    // Check if the username or email already exists
    const checkUser = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .query(`
        SELECT username, uEmail FROM Users
        WHERE username = @username OR uEmail = @email
      `);

    if (checkUser.recordset.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists', success: false });
    }

    // Insert new user into the database
    await pool.request()
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)  
      .input('email', sql.VarChar, email)
      .input('uTitle', sql.NVarChar, 'Mr.')
      .input('userGroup', sql.VarChar, 'Customer')  
      .input('uStatus', sql.VarChar, 'registered')
      .input('uActivation', sql.VarChar, 'Active')
      
      
      .query(`
        INSERT INTO Users (uFirstName, uLastName, username, password, uEmail, uTitle, userGroup, uStatus, uActivation)
        VALUES (@firstName, @lastName, @username, @password, @email, @uTitle,  @userGroup, @uStatus, @uActivation)
      `);

    res.status(201).json({ message: 'User registered successfully', success: true });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// User login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Verify user credentials and fetch userID, userGroup
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT userID, userGroup, uActivation FROM Users
        WHERE username = @username
        AND password = @password
      `);

    if (result.recordset.length > 0) {
      const { userID, userGroup, uActivation } = result.recordset[0];

      // Update user status to logged in
      await pool.request()
        .input('username', sql.VarChar, username)
        .query(`
          UPDATE Users
          SET uStatus = 'login'
          WHERE username = @username
        `);

      // Respond with userID and userGroup
      res.status(200).json({
        message: 'Login Successful',
        success: true,
        userID, 
        userGroup,
        uActivation 
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password', success: false });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Server error', success: false});
  }
});

// User logout endpoint
app.post('/logout', async (req, res) => {
  const { userID } = req.body;

  try {
    // Update user status to logged out
    await pool.request()
      .input('userID', sql.VarChar, userID)
      .query("UPDATE Users SET uStatus = 'logout' WHERE userID = @userID");

    res.status(200).json({ message: 'Logout Successful', success: true });
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Fetch list of customers
app.get('/users/customers', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT userID, uFirstName, uLastName, uEmail, uPhoneNo, uCountry, uZipCode, uActivation, uGender, uTitle
      FROM Users
      WHERE userGroup = 'Customer'
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } 
});

// Fetch list of owners
app.get('/users/owners', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT userID, username, uFirstName, uLastName, uEmail, uPhoneNo, uCountry, uZipCode, uGender, userGroup, uTitle
      FROM Users
      WHERE userGroup = 'Owner'
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching owners:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Fetch list of moderators
app.get('/users/moderators', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT userID, username, uFirstName, uLastName, uEmail, uPhoneNo, userGroup, uActivation, uGender, uCountry, uZipCode, uTitle
      FROM Users
      WHERE userGroup = 'Moderator'
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching moderators:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Fetch list of operators (Moderators and Administrators)
app.get('/users/operators', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT userID, username, uFirstName, uLastName, uEmail, uPhoneNo, userGroup, uActivation, uGender, uCountry, uZipCode, uTitle
      FROM Users
      WHERE userGroup IN ('Moderator', 'Administrator')
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching operators:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Fetch list of administrators
app.get('/users/administrators', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT userID, username, uFirstName, uLastName, uEmail, uPhoneNo, userGroup, uActivation, uGender, uCountry, uZipCode
      FROM Users
      WHERE userGroup = 'Administrator'
    `);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching administrators:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Create moderators
app.post('/users/createModerator', async (req, res) => {
  const { firstName, lastName, username, password, email, phoneNo, country, zipCode } = req.body;

  try {
    // Check if the username or email already exists
    const checkUser = await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .query(`
        SELECT username, uEmail FROM Users
        WHERE username = @username OR uEmail = @email
      `);

    if (checkUser.recordset.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists', success: false });
    }

    // Insert new user into the database
    await pool.request()
      .input('firstName', sql.VarChar, firstName)
      .input('lastName', sql.VarChar, lastName)
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)  
      .input('email', sql.VarChar, email)
      .input('phoneNo', sql.BigInt, phoneNo)
      .input('country', sql.VarChar, country)
      .input('zipCode', sql.Int, zipCode)
      .input('uTitle', sql.NVarChar, 'Mr.')
      .input('userGroup', sql.VarChar, 'Moderator')  
      .input('uStatus', sql.VarChar, 'registered')
      .input('uActivation', sql.VarChar, 'Active')
      
      
      .query(`
        INSERT INTO Users (uFirstName, uLastName, username, password, uEmail, uPhoneNo, uCountry, uZipCode, uTitle, userGroup, uStatus, uActivation)
        VALUES (@firstName, @lastName, @username, @password, @email, @phoneNo, @country, @zipCode, @uTitle,  @userGroup, @uStatus, @uActivation)
      `);

    res.status(201).json({ message: 'User registered successfully', success: true });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Update users by user ID
app.put('/users/updateUser/:userID', async (req, res) => {
  const { userID } = req.params;
  const { firstName, lastName, username, email, phoneNo, country, zipCode } = req.body;

  try {
      // Update user details 
      await pool.request()
          .input('userID', sql.Int, userID)
          .input('firstName', sql.VarChar, firstName)
          .input('lastName', sql.VarChar, lastName)
          .input('username', sql.VarChar, username)
          .input('email', sql.VarChar, email)
          .input('phoneNo', sql.BigInt, phoneNo)
          .input('country', sql.VarChar, country)
          .input('zipCode', sql.Int, zipCode)
          .query(`
              UPDATE Users
              SET uFirstName = @firstName, 
                  uLastName = @lastName, 
                  username = @username, 
                  uEmail = @email,
                  uPhoneNo = @phoneNo,
                  uCountry = @country,
                  uZipCode = @zipCode
              WHERE userID = @userID
          `);
          console.log(`
    UPDATE Users
    SET uFirstName = '${firstName}', 
        uLastName = '${lastName}', 
        username = '${username}', 
        uEmail = '${email}',
        uPhoneNo = '${phoneNo}',
        uCountry = '${country}',
        uZipCode = '${zipCode}'
    WHERE userID = '${userID}'
`);

      res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Remove users by user ID
app.delete('/users/removeUser/:userID', async (req, res) => {
  const { userID } = req.params;

  try {
    // Check if the user exists
    const userCheck = await pool.request()
    .input('userID', sql.Int, userID)
    .query('SELECT userID FROM Users WHERE userID = @userID');
    
    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        DELETE FROM Users
        WHERE userID = @userID
      `);

    res.status(200).json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Suspend users by user ID
app.put('/users/suspendUser/:userID', async (req, res) => {
  try {
    const { userID } = req.params;

    await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        UPDATE Users
        SET uActivation = 'Inactive'
        WHERE userID = @userID
      `);

    res.status(200).json({ message: 'User suspended successfully' });
  } catch (err) {
    console.error('Error suspending user:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Activate users by user ID
app.put('/users/activateUser/:userID', async (req, res) => {
  try {
    const { userID } = req.params;

    await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        UPDATE Users
        SET uActivation = 'Active'
        WHERE userID = @userID
      `);

    res.status(200).json({ message: 'User activated successfully' });
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Add a new property listing with image upload support
app.post('/propertiesListing', upload.array('propertyImage', 10), async (req, res) => { 
  const { username, propertyName, propertyPrice, propertyDescription, propertyLocation, propertyBedType, propertyGuestPaxNo } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one property image.' });
  }

  try {
    // Fetch user ID and userGroup for property owner
    const userResult = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT userID, userGroup FROM Users WHERE username = @username');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { userID, userGroup } = userResult.recordset[0];

    // Determine propertyStatus based on userGroup
    const propertyStatus = userGroup === 'Administrator' ? 'Available' : 'Pending';

    // Convert images to base64 and concatenate them
    const base64Images = req.files.map(file => file.buffer.toString('base64'));
    const concatenatedImages = base64Images.join(',');

    // Insert new property with images and conditional status
    const propertyListingResult = await pool.request()
      .input('propertyName', sql.VarChar, propertyName)
      .input('propertyPrice', sql.Float, propertyPrice)
      .input('propertyDescription', sql.VarChar, propertyDescription)
      .input('propertyLocation', sql.VarChar, propertyLocation)
      .input('propertyBedType', sql.VarChar, propertyBedType)
      .input('propertyGuestPaxNo', sql.VarChar, propertyGuestPaxNo)
      .input('propertyStatus', sql.VarChar, propertyStatus)
      .input('userID', sql.Int, userID)
      .input('propertyImage', sql.VarChar(sql.MAX), concatenatedImages)
      .query('INSERT INTO Property (propertyName, propertyPrice, propertyDescription, propertyLocation, propertyBedType, propertyGuestPaxNo, propertyStatus, userID, propertyImage) OUTPUT inserted.propertyID VALUES (@propertyName, @propertyPrice, @propertyDescription, @propertyLocation, @propertyBedType, @propertyGuestPaxNo, @propertyStatus, @userID, @propertyImage)');

    const propertyID = propertyListingResult.recordset[0].propertyID;

    res.status(201).json({ message: 'Property created successfully', propertyID });
  } catch (err) {
    console.error('Error inserting property: ', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Fetch list of all property listings (Product)
app.get('/product', async (req, res) => {
  try {
    const result = await pool.request().query(`SELECT * FROM Property WHERE propertyStatus = 'Available'`);
    const properties = result.recordset.map(property => {
      return {
        ...property,
        propertyImage: property.propertyImage ? property.propertyImage.split(',') : []
      };
    });

    res.status(200).json(properties);
  } catch (err) {
    console.error('Error fetching properties: ', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
})

// Fetch list of all property listings (Dashboard)
app.get('/propertiesListingTable', async (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const userResult = await pool
      .request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT userID, userGroup 
        FROM Users 
        WHERE username = @username
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userID = userResult.recordset[0].userID;
    const userGroup = userResult.recordset[0].userGroup;

    let query;

    if (userGroup === 'Moderator') {
      // If user is a Moderator, fetch properties created by that user only
      query = `
        SELECT 
          p.propertyID, 
          p.propertyName, 
          p.propertyPrice, 
          p.propertyDescription, 
          p.propertyLocation, 
          p.propertyBedType, 
          p.propertyGuestPaxNo, 
          p.propertyStatus, 
          p.propertyImage,
          u.uFirstName, 
          u.uLastName,
          u.username
        FROM Property p
        JOIN Users u ON p.userID = u.userID
        WHERE p.userID = @userID
      `;
    } else{
      
      query = `
        SELECT 
          p.propertyID, 
          p.propertyName, 
          p.propertyPrice, 
          p.propertyDescription, 
          p.propertyLocation, 
          p.propertyBedType, 
          p.propertyGuestPaxNo, 
          p.propertyStatus, 
          p.propertyImage,
          u.uFirstName, 
          u.uLastName,
          u.username
        FROM Property p
        JOIN Users u ON p.userID = u.userID
      `;
    }

    const result = await pool
      .request()
      .input('userID', sql.Int, userID)
      .query(query);

    const properties = result.recordset.map(property => ({
      ...property,
      propertyImage: property.propertyImage ? property.propertyImage.split(',') : []
    }));

    res.status(200).json({ properties });
  } catch (err) {
    console.error('Error fetching properties: ', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } 
});

// Update an existing property listing by property ID
app.put('/propertiesListing/:propertyID', upload.array('propertyImage', 10), async (req, res) => {
  const { propertyID } = req.params;
  const {
      propertyName, propertyPrice, propertyDescription, propertyLocation,
      propertyBedType, propertyGuestPaxNo, username
  } = req.body;

  const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];

  try {
      const pool = await sql.connect(dbConfig);

      // Fetch the current status of the property
      const propertyResult = await pool.request()
          .input('propertyID', sql.Int, propertyID)
          .query('SELECT propertyStatus, propertyImage FROM Property WHERE propertyID = @propertyID');

      if (propertyResult.recordset.length === 0) {
          return res.status(404).json({ error: 'Property not found' });
      }

      const currentStatus = propertyResult.recordset[0].propertyStatus;

      let existingImages = propertyResult.recordset[0].propertyImage
          ? propertyResult.recordset[0].propertyImage.split(',')
          : [];

      // Filter out removed images
      existingImages = existingImages.filter(image => !removedImages.includes(image));

      // Add new uploaded images if any
      if (req.files && req.files.length > 0) {
          const newBase64Images = req.files.map(file => file.buffer.toString('base64'));
          existingImages = [...existingImages, ...newBase64Images];
      }

      const concatenatedImages = existingImages.join(',');

      // Update the property
      await pool.request()
          .input('propertyID', sql.Int, propertyID)
          .input('propertyName', sql.VarChar, propertyName)
          .input('propertyPrice', sql.Float, propertyPrice)
          .input('propertyDescription', sql.VarChar, propertyDescription)
          .input('propertyLocation', sql.VarChar, propertyLocation)
          .input('propertyBedType', sql.VarChar, propertyBedType)
          .input('propertyGuestPaxNo', sql.VarChar, propertyGuestPaxNo)
          .input('propertyStatus', sql.VarChar, currentStatus) // Use existing status
          .input('propertyImage', sql.VarChar(sql.MAX), concatenatedImages)
          .query(`
              UPDATE Property 
              SET propertyName = @propertyName, 
                  propertyPrice = @propertyPrice, 
                  propertyDescription = @propertyDescription, 
                  propertyLocation = @propertyLocation, 
                  propertyBedType = @propertyBedType, 
                  propertyGuestPaxNo = @propertyGuestPaxNo, 
                  propertyImage = @propertyImage
              WHERE propertyID = @propertyID
          `);

      res.status(200).json({ message: 'Property updated successfully' });
  } catch (err) {
      console.error('Error updating property:', err);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});


// Update property status
app.patch('/updatePropertyStatus/:propertyID', async (req, res) => {
  const { propertyID } = req.params;
  const { propertyStatus } = req.body;

  try {
    await pool.request()
      .input('propertyStatus', sql.VarChar, propertyStatus)
      .input('propertyID', sql.Int, propertyID)
      .query(`UPDATE Property SET propertyStatus = @propertyStatus WHERE propertyID = @propertyID`);

    res.status(200).json({ message: 'Property status updated successfully' });
  } catch (error) {
    console.error('Error updating property status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete a property by propertyID
app.delete('/propertiesListing/:propertyID', async (req, res) => {
  const { propertyID } = req.params;

  try {
    // Check if the property exists
    const propertyCheck = await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .query('SELECT propertyID FROM Property WHERE propertyID = @propertyID');

    if (propertyCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found', success: false });
    }

    // Delete the property from the database
    await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .query('DELETE FROM Property WHERE propertyID = @propertyID');

    res.status(200).json({ message: 'Property deleted successfully', success: true });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message, success: false });
  }
});

// Check user status by userID
app.get('/checkStatus', async(req, res) => {
  const { userID } = req.query;

  try {
    const result = await pool.request()
      .input('userID', sql.VarChar, userID)
      .query('SELECT uStatus FROM Users WHERE userID = @userID');

    if (result.recordset.length > 0) {
      const uStatus = result.recordset[0].uStatus;
      res.status(200).json({ uStatus });
    }else {
      res.status(404).json({ message: 'User not found' });
    }
  }catch (err) {
    console.error('Error fetching user status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send contact us email
app.post('/contact_us', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'wilson336933@gmail.com',
      pass: 'nditynbfwuchdpgx',
    },
  });

  const mailOptions = {
    from: 'wilson336933@gmail.com',  
    to: 'wilson336933@gmail.com',
    subject: `Message from ${name}`,

    html: `
    <h1>New Message from ${name}</h1>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
    <p><strong>Email:</strong> ${email}</p>`,

    replyTo: email, 
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error.response);
    res.status(500).json({ message: 'Failed to send email', error: error.response});
  }
});

// Send Booking Request Message To Administrator Or Moderator
app.post('/requestBooking/:reservationID', async (req, res) => {
  const { reservationID } = req.params;

  try {
    const result = await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .query(`SELECT rc.rcLastName, rc.rcTitle, r.checkInDateTime, r.checkOutDateTime, r.request, r.reservationPaxNo, r.totalPrice, p.propertyName, u.uEmail FROM Reservation_Customer_Details rc JOIN Reservation r ON rc.rcID = r.rcID JOIN Property p ON r.propertyID = p.propertyID JOIN Users u ON u.userID = p.userID WHERE reservationID = @reservationID`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Reservation or user not found for this property' });
    }

    const { rcLastName: customerLastName, rcTitle: customerTitle, checkInDateTime: reservationCheckInDateTime, checkOutDateTime: reservationCheckOutDateTime, request: reservationRequest = '-', reservationPaxNo: reservationPaxNumber, totalPrice: reservationTotalPrice, propertyName: reservationProperty, uEmail: userEmail } = result.recordset[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: userEmail,
      subject: 'Booking Request',
      html: `
      <h1><b>Do You Accept This Booking By ${customerTitle} ${customerLastName}?</b></h1><hr/>
      <p><b>Check In Date:</b> ${reservationCheckInDateTime}</p>
      <p><b>Check Out Date:</b> ${reservationCheckOutDateTime}</p>
      <p><b>Pax Number:</b> ${reservationPaxNumber}</p>
      <p><b>Request:</b> ${reservationRequest}</p>
      <p><b>Property Name:</b> ${reservationProperty}</p>
      <p><b>Total Price: <i>RM${reservationTotalPrice}</i></b></p><br/>
      <p><b>Please kindly click the button below to make the decision in <b>12 hours</b> time frame.</b></p>
      <div style="margin: 10px 0;">
        <a href="" style="background-color: green; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept</a>
        <a href="" style="background-color: red; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reject</a>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send Booking Request Accepted Message To Customer
app.post('/accept_booking/:reservationID', async (req, res) => {
  const { reservationID } = req.params;

  try {
    const result = await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .query(`SELECT rc.rcLastName, rc.rcEmail, rc.rcTitle, r.checkInDateTime, r.checkOutDateTime, r.reservationBlockTime, p.propertyName FROM Reservation_Customer_Details rc JOIN Reservation r ON rc.rcID = r.rcID JOIN Property p ON r.propertyID = p.propertyID WHERE reservationID = @reservationID`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Reservation customer or property not found for this reservation' });
    }

    const { rcLastName: customerLastName, rcEmail: customerEmail, rcTitle: customerTitle, checkInDateTime: reservationCheckInDate, checkOutDateTime: reservationCheckOutDate, reservationBlockTime: paymentDueDate, propertyName: reservationProperty } = result.recordset[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: customerEmail,
      subject: 'Booking Accepted',
      html: `
      <h1><b>Dear ${customerTitle} ${customerLastName},</b></h1><hr/>
      <p>Your booking for <b>${reservationProperty}</b> from <b>${reservationCheckInDate}</b> to <b>${reservationCheckOutDate}</b> has been <span style="color: green">accepted</span>.</p> 
      <p>Please kindly click the button below to make payment before <b>${paymentDueDate}</b> to secure your booking.</p>  
      <a href="" style="background-color: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Pay</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send New Room Suggestion To Customer
app.post('/suggestNewRoom/:propertyID/:reservationID', async (req, res) => {
  const { propertyID, reservationID } = req.params;

  try {
    const result = await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .query(`SELECT propertyName, propertyPrice, propertyLocation, propertyBedType, propertyGuestPaxNo FROM Property WHERE propertyID = @propertyID`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found for suggestion' });
    }

    const property = result.recordset[0];

    const { propertyName: suggestPropertyName, propertyPrice: suggestPropertyPrice, propertyLocation: suggestPropertyLocation, propertyBedType: suggestPropertyBedType, propertyGuestPaxNo: suggestPropertyGuestPaxNo } = property;

    const customerReservationResult = await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .query(`SELECT rc.rcLastName, rc.rcEmail, rc.rcTitle, p.propertyName, r.checkInDateTime, r.checkOutDateTime FROM Reservation r JOIN Property p ON p.propertyID = r.propertyID JOIN Reservation_Customer_Details rc ON rc.rcID = r.rcID WHERE reservationID = @reservationID`);

    if (customerReservationResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User email not found for suggestion' });
    }

    const { rcLastName: customerLastName, rcEmail: customerEmail, rcTitle: customerTitle, propertyName: reservationProperty, checkInDateTime: reservationCheckInDate, checkOutDateTime: reservationCheckOutDate } = customerReservationResult.recordset[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: customerEmail,
      subject: 'Booking Request Rejected & New Room Suggestion',
      html: `
      <h1><b>Dear ${customerTitle} ${customerLastName},</b></h1><hr/>
      <p>Your booking for <b>${reservationProperty}</b> from <b>${reservationCheckInDate}</b> to <b>${reservationCheckOutDate}</b> has been <span style="color: red">rejected</span> due to room unavailable during the time selected.</p> 
      <p>A similar room with the details below is suggested for consideration:</p> 
      <h3>Property Name: ${suggestPropertyName}</h3>
      <p><b>Property Location:</b> ${suggestPropertyLocation}</p>
      <p><b>Bed Type:</b> ${suggestPropertyBedType}</p>
      <p><b>Pax Number:</b> ${suggestPropertyGuestPaxNo}</p>
      <p><b>Price: <i>RM${suggestPropertyPrice}</i></b></p><br/>
      <p>Please kindly make your decision by clicking the buttons below</p>
      <div style="margin: 10px 0;">
        <a href="" style="background-color: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Pay</a>
        <a href="" style="background-color: red; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reject</a>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send Properties Listing Request Notification From Moderator
app.post('/propertyListingRequest/:propertyID', async (req, res) => {
  const { propertyID } = req.params;

  try {
    const moderatorResult = await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .query(`SELECT p.propertyName, u.uLastName, u.uTitle, u.userGroup FROM Property p JOIN Users u ON u.userID = p.userID WHERE p.propertyID = @propertyID`);

    if (moderatorResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Property or moderator not found for this property listing request' });
    } else if (moderatorResult.recordset[0].userGroup !== 'Moderator') {
      return res.status(200).json({ message: 'Property Created Successfully' });
    }

    const { propertyName: property, uLastName: moderatorLastName, uTitle: moderatorTitle } = moderatorResult.recordset[0];

    const administratorResult = await pool.request()
      .query(`SELECT uEmail FROM Users WHERE userGroup = 'Administrator'`)

    if (administratorResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Administrators not found' });
    }

    const adminEmails = administratorResult.recordset.map(record => record.uEmail);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: adminEmails,
      subject: 'Property Listing Request',
      html: `
      <h1><b>Dear Administrators,</b></h1><hr/>
      <p>Moderator ${moderatorTitle} ${moderatorLastName} would like to request listing a new property with the name of <b>${property}</b> into the "Hello Sarawak" app.</p>
      <p>Please kindly click the button below to view more details and make the decision in <b>12 hours</b> time frame.</p>
      <div style="margin: 10px 0;">
        <a href="" style="background-color: green; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept</a>
        <a href="" style="background-color: red; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reject</a>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send Properties Listing Request Accepted Notification To Moderator
app.post('/propertyListingAccept/:propertyID', async (req, res) => {
  const { propertyID } = req.params;

  try {
    const result = await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .query(`SELECT p.propertyName, u.uLastName, u.uEmail, u.uTitle FROM Property p JOIN Users u ON u.userID = p.userID WHERE p.propertyID = @propertyID`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Property or user not found for this reservation' });
    }

    const { propertyName: property, uLastName: moderatorLastName, uEmail: moderatorEmail, uTitle: moderatorTitle } = result.recordset[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: moderatorEmail,
      subject: 'Property Listing Request Accepted',
      html: `
      <h1><b>Dear ${moderatorTitle} ${moderatorLastName},</b></h1><hr/>
      <p>Your request for property listing of property named <b>${property}</b> has been <span style="color: green">accepted</span> by the Administrator.</p>
      <p>Please kindly click the button below to check the details of the listed property.</p>
      <a href="" style="background-color: brown; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Hello Sarawak</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send Properties Listing Request Rejected Notification To Moderator
app.post('/propertyListingReject/:propertyID', async (req, res) => {
  const { propertyID } = req.params;

  try {
    const result = await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .query(`SELECT p.propertyName, u.uLastName, u.uEmail, u.uTitle FROM Property p JOIN Users u ON u.userID = p.userID WHERE p.propertyID = @propertyID`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Property or user not found for this reservation' });
    }

    const { propertyName: property, uLastName: moderatorLastName, uEmail: moderatorEmail, uTitle: moderatorTitle } = result.recordset[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: moderatorEmail,
      subject: 'Property Listing Request Rejected',
      html: `
      <h1><b>Dear ${moderatorTitle} ${moderatorLastName},</b></h1><hr/>
      <p>Your request for property listing of property named <b>${property}</b> has been <span style="color: red">rejected</span> by the Administrator due to violation of policy.</p>
      <p>Please kindly click the button below to list the property again with appropriate information in <b>12 hours</b> time frame.</p>
      <a href="" style="background-color: brown; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Hello Sarawak</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send "Suggest" Notification To Operators
app.post('/sendSuggestNotification/:reservationID', async (req, res) => {
  const { userIDs } = req.body;
  const { reservationID } = req.params;

  try {
    const result = await pool.query(`
      SELECT * 
      FROM Users 
      WHERE userID IN (${userIDs.join(', ')})
    `);

    if(result.recordset.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    const selectedEmails = result.recordset.map(record => record.uEmail);

    const reservationResult = await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .query(`SELECT p.propertyName, r.checkInDateTime, r.checkOutDateTime, rc.rcLastName, rc.rcTitle FROM Property p JOIN Reservation r ON p.propertyID = r.propertyID JOIN Reservation_Customer_Details rc ON rc.rcID = r.rcID WHERE reservationID = @reservationID`);

    if(reservationResult.recordset.length === 0) {
      return res.status(404).json({ message: 'No reservation or customer found' });
    }

    const { propertyName: reservationProperty, checkInDateTime: reservationCheckInDate, checkOutDateTime: reservationCheckOutDate, rcLastName: customerLastName, rcTitle: customerTitle } = reservationResult.recordset[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'laudarren911@gmail.com',
        pass: 'tlld oplc qepx hbzy',
      },
    });

    const mailOptions = {
      from: 'laudarren911@gmail.com',
      to: selectedEmails,
      subject: 'Suggestion Available',
      html: `
      <h1><b>Dear Operators,</b></h1><hr/>
      <p>Reservation of customer <b>${customerTitle} ${customerLastName}</b> is now open for suggestion with the following details:</p>
      <p><b>Property Name:</b> ${reservationProperty}</p>
      <p><b>Check In Date:</b> ${reservationCheckInDate}</p>
      <p><b>Check Out Date:</b> ${reservationCheckOutDate}</p>
      <br/>
      <p>Please kindly click the button below to pick up the "Suggest" opportunity with first come first serve basis</p>
      <p>You may <b>ignore</b> this message if <b>not interested</b></p>
      <a href="" style="background-color: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Pick Up</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email Sent Successfully' })
  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
})

//Create reservation for property
app.post('/reservation/:userID', async (req, res) => {
  const { propertyID, checkInDateTime, checkOutDateTime, reservationBlockTime, request, totalPrice, adults, children, rcFirstName, rcLastName, rcEmail, rcPhoneNo, rcTitle } = req.body;
  const userID = req.params.userID;

  if (!userID) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const reservationPaxNo = `${adults} ${adults === 1 ? 'Adult' : 'Adults'} ${children} ${children === 1 ? 'Kid' : 'Kids'}`;

  try {
    // Insert customer details
    const customerResult = await pool.request()
      .input('rcFirstName', sql.VarChar, rcFirstName)
      .input('rcLastName', sql.VarChar, rcLastName)
      .input('rcEmail', sql.VarChar, rcEmail)
      .input('rcPhoneNo', sql.BigInt, rcPhoneNo)
      .input('rcTitle', sql.VarChar, rcTitle)
      .query(`
        INSERT INTO Reservation_Customer_Details (rcFirstName, rcLastName, rcEmail, rcPhoneNo, rcTitle)
        OUTPUT inserted.rcID
        VALUES (@rcFirstName, @rcLastName, @rcEmail, @rcPhoneNo, @rcTitle)
      `);

    const rcID = customerResult.recordset[0].rcID;

    // Insert reservation details
    const reservationResult = await pool.request()
      .input('propertyID', sql.Int, propertyID)
      .input('checkInDateTime', sql.DateTime, checkInDateTime)
      .input('checkOutDateTime', sql.DateTime, checkOutDateTime)
      .input('reservationBlockTime', sql.DateTime, reservationBlockTime)
      .input('request', sql.VarChar, request)
      .input('totalPrice', sql.Float, totalPrice)
      .input('rcID', sql.Int, rcID)
      .input('reservationPaxNo', sql.VarChar, reservationPaxNo)
      .input('reservationStatus', sql.VarChar, 'Pending')
      .input('userID', sql.Int, userID)
      .query(`
        INSERT INTO Reservation (propertyID, checkInDateTime, checkOutDateTime, reservationBlockTime, request, totalPrice, rcID, reservationPaxNo, reservationStatus, userID)
        OUTPUT inserted.reservationID
        VALUES (@propertyID, @checkInDateTime, @checkOutDateTime, @reservationBlockTime, @request, @totalPrice, @rcID, @reservationPaxNo, @reservationStatus, @userID)
      `);

    const reservationID = reservationResult.recordset[0].reservationID;

    // Log the booking in Audit_Trail with the propertyID and reservationID
    await pool.request()
      .input('timestamp', sql.DateTime, new Date())
      .input('action', sql.VarChar, `Booking created for reservationID ${reservationID} and propertyID ${propertyID}`)
      .input('updatedBy', sql.Int, userID)
      .query(`
        INSERT INTO Audit_Trail (timestamp, action, updatedBy)
        VALUES (@timestamp, @action, @updatedBy)
      `);

    res.status(201).json({ message: 'Reservation and Audit Log created successfully', reservationID });
  } catch (err) {
    console.error('Error inserting reservation data:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  }
});

// Fetch Book and Pay Log
app.get('/users/booklog', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        a.updatedBy, 
        a.timestamp, 
        a.action,
        CASE 
          WHEN CHARINDEX('PropertyID', a.action) > 0 
          THEN
            CAST(
              LEFT(
                LTRIM(
                  SUBSTRING(
                    a.action,
                    CHARINDEX('PropertyID ', a.action) + 10, 
                    LEN(a.action) - CHARINDEX('PropertyID ', a.action) + 10
                  )
                ),
                CHARINDEX(' ', 
                  LTRIM(SUBSTRING(
                    a.action,
                    CHARINDEX('PropertyID ', a.action) + 10, 
                    LEN(a.action) - CHARINDEX('PropertyID ', a.action) + 10
                  )) + ' ') - 1
              ) AS INT
            )
          ELSE NULL 
        END AS propertyID
      FROM Audit_Trail a
      WHERE a.action LIKE '%PropertyID%'
      ORDER BY a.timestamp DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching Book Log:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  }
});

app.get('/users/finance', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        FORMAT(checkInDateTime, 'yyyy-MM') as month,
        SUM(totalPrice) AS monthlyRevenue,
        COUNT(reservationID) AS monthlyReservations
      FROM Reservation
      WHERE reservationStatus = 'Accepted'
      GROUP BY FORMAT(checkInDateTime, 'yyyy-MM')
      ORDER BY month;
    `);

    if (result.recordset && result.recordset.length > 0) {
      console.log('Monthly data:', result.recordset);
      
      res.json({
        monthlyData: result.recordset
      });
    } else {
      res.status(404).json({ message: 'No reservations found' });
    }
    
  } catch (err) {
    console.error('Error fetching finance data:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  }
});

// Fetch reservations for the logged-in user
app.get('/cart', async (req, res) => {
  const userID = req.query.userID;

  if (!userID || isNaN(userID)) {
    return res.status(400).json({ error: 'Invalid or missing userID' });
  }

  try {
    // Fetch reservations by userID from the database
    const reservationResult = await pool
      .request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT 
          r.reservationID,
          r.propertyID,
          p.propertyName, 
          p.propertyImage,
          r.checkInDateTime,
          r.checkOutDateTime,
          r.reservationBlockTime,
          r.request,
          r.totalPrice,
          r.reservationPaxNo,
          r.reservationStatus,
          r.rcID,
          r.userID
        FROM 
          Reservation r
        JOIN 
          Property p ON r.propertyID = p.propertyID
        WHERE 
          r.userID = @userID
      `);

    // Process the results to format property image if needed
    const reservations = reservationResult.recordset.map(reservation => ({
      ...reservation,
      propertyImage: reservation.propertyImage ? reservation.propertyImage.split(',') : []  // Assuming propertyImage is a comma-separated list
    }));

    res.status(200).json({ userID, reservations });
  } catch (err) {
    console.error('Error fetching reservations by userID:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Fetch all reservations (Dashboard)
app.get('/reservationTable', async (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Fetch userID and userGroup from the Users table
    const userResult = await pool
      .request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT userID, userGroup 
        FROM Users 
        WHERE username = @username
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userID = userResult.recordset[0].userID;
    const userGroup = userResult.recordset[0].userGroup;

    // Base query for fetching reservations
    let query = `
      SELECT 
        r.reservationID,
        r.propertyID,
        p.propertyName, 
        p.propertyImage,
        p.userID,
        r.checkInDateTime,
        r.checkOutDateTime,
        r.reservationBlockTime,
        r.request,
        r.totalPrice,
        r.reservationPaxNo,
        r.reservationStatus,
        r.rcID,
        rc.rcFirstName,
        rc.rcLastName,
        rc.rcEmail,
        rc.rcPhoneNo,
        rc.rcTitle
      FROM 
        Reservation r
      JOIN 
        Property p ON r.propertyID = p.propertyID
      JOIN 
        Reservation_Customer_Details rc ON r.rcID = rc.rcID
    `;

    // Apply filter for moderators
    if (userGroup === 'Moderator') {
      query += ` WHERE p.userID = @userID AND r.reservationStatus IN ('Pending', 'Accepted', 'Rejected', 'Canceled', 'Paid')`;
    } else {
      query += ` WHERE r.reservationStatus IN ('Pending', 'Accepted', 'Rejected', 'Canceled', 'Paid')`;
    }

    // Execute the query
    const result = await pool
      .request()
      .input('userID', sql.Int, userID)
      .query(query);

    // Process reservations to split propertyImage into an array
    const reservations = result.recordset.map(reservation => ({
      ...reservation,
      propertyImage: reservation.propertyImage ? reservation.propertyImage.split(',') : []
    }));

    res.status(200).json({ reservations });
  } catch (err) {
    console.error('Error fetching reservation data for reservation table:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  }
});

// Update reservation status to "Canceled"
app.put('/cancelReservation/:reservationID', async (req, res) => {
  const { reservationID } = req.params;

  try {
    await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .input('reservationStatus', sql.VarChar, 'Canceled')
      .query(`
        UPDATE Reservation 
        SET reservationStatus = @reservationStatus
        WHERE reservationID = @reservationID;
      `);

    res.status(200).json({ message: 'Reservation status updated to Canceled' });
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  }
});

// Update reservation status
app.patch('/updateReservationStatus/:reservationID', async (req, res) => {
  const { reservationID } = req.params;
  const { reservationStatus } = req.body;

  try {
    await pool.request()
      .input('reservationStatus', sql.VarChar, reservationStatus)
      .input('reservationID', sql.Int, reservationID)
      .query(`UPDATE Reservation SET reservationStatus = @reservationStatus WHERE reservationID = @reservationID`);

    res.status(200).json({ message: 'Reservation status updated successfully' });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Remove reservation
app.delete('/removeReservation/:reservationID', async (req, res) => {
  const { reservationID } = req.params;

  try {
    // Delete reservation from the Reservation table
    await pool.request()
      .input('reservationID', sql.Int, reservationID)
      .query(`DELETE FROM Reservation WHERE reservationID = @reservationID`);

    res.status(200).json({ message: 'Reservation removed successfully' });
  } catch (err) {
    console.error('Error deleting reservation:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  }
});

// Get Properties Of Particular Administrator For "Suggest"
app.get('/operatorProperties/:userID', async (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'userID of Operator is not found' });
  }

  try {
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .query(`SELECT * FROM Property WHERE userID = @userID AND propertyStatus = 'Available'`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No properties found for this Operator' });
    }

    const propertiesWithSeparatedImages = result.recordset.map(property => ({
      ...property,
      images: property.propertyImage ? property.propertyImage.split(',') : [],
    }));

    res.status(200).json({ status: 'success', message: 'Properties Retrieved Successfully', data: propertiesWithSeparatedImages, });
  } catch (err) {
    console.error('Error retrieving properties: ', err);
    res.status(500).json({ message: 'An error occurred while retrieving properties', error: err.message });
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
