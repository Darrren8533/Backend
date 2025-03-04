//Register
export const signupUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:5000/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};

// Login
export const loginUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};

// Logout
export const logoutUser = async (userID) => {
  try {
    const response = await fetch('http://localhost:5000/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userID }),
    });

    const responseData = await response.json();
    return responseData;
  }catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Properties Listing
export const propertiesListing = async (propertyData) => {
  try {
    const response = await fetch('http://localhost:5000/propertiesListing', {
      method: 'POST',
      body: propertyData,
    });

    if(!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create property');
    }

    const responseData = await response.json();
    return responseData;
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Fetch Properties (Product)
export const fetchProduct = async () => {
  try {
    const response = await fetch('http://localhost:5000/product');

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }
    const data = await response.json();
    return data; 
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error; 
  }
};

// Fetch Properties (Dashboard)
export const fetchPropertiesListingTable = async () => {

  const username = localStorage.getItem('username'); 
  try {
    const response = await fetch(`http://localhost:5000/propertiesListingTable?username=${username}`);

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const data = await response.json();
    return data; 
  } catch (error) {
    console.error('Error fetching properties', error);
    throw error;
  }
};

// Update Property
export const updateProperty = async (propertyData, propertyID) => {
  try {
    const response = await fetch(`http://localhost:5000/propertiesListing/${propertyID}`, {
      method: 'PUT',
      body: propertyData, // Ensure this is FormData to handle images properly
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update property');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Update property status
export const updatePropertyStatus = async (propertyID, status) => {
  try {
    const response = await fetch(`http://localhost:5000/updatePropertyStatus/${propertyID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyStatus: status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update property status');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Delete Property
export const deleteProperty = async (propertyID) => {
  try {
    const response = await fetch(`http://localhost:5000/propertiesListing/${propertyID}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete property');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch Customers
export const fetchCustomers = async () => {
  try {
    const response = await fetch('http://localhost:5000/users/customers');

    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

//Fetch Owners
export const fetchOwners = async () => {
  try {
    const response = await fetch('http://localhost:5000/users/owners');

    if (!response.ok) {
      throw new Error('Failed to fetch owners');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

//Fetch Moderators
export const fetchModerators = async () => {
  try {
    const response = await fetch('http://localhost:5000/users/moderators');

    if (!response.ok) {
      throw new Error('Failed to fetch moderators');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

//Fetch Operators
export const fetchOperators = async () => {
  try {
    const response = await fetch('http://localhost:5000/users/operators');

    if (!response.ok) {
      throw new Error('Failed to fetch operators');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

//Fetch Administrator
export const fetchAdministrators = async () => {
  try {
    const response = await fetch('http://localhost:5000/users/administrators');

    if (!response.ok) {
      throw new Error('Failed to fetch administrators');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Create Moderator
export const createModerator = async (userData) => {
  try {
    const response = await fetch('http://localhost:5000/users/createModerator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to create moderator');
    }

    return response;
  } catch (error) {
    console.error('API error:', error);
    throw error; 
  }
};

// Update User
export const updateUser = async (userData, userID) => {
  try {
    const response = await fetch(`http://localhost:5000/users/updateUser/${userID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update user');
      } catch {
          throw new Error('Failed to update user (non-JSON error response)');
      }
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Remove User
export const removeUser = async (userID) => {
  try {
    const response = await fetch(`http://localhost:5000/users/removeUser/${userID}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Suspend User
export const suspendUser = async (userID) => {
  try {
    const response = await fetch(`http://localhost:5000/users/suspendUser/${userID}`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error('Failed to suspend user');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Activate User
export const activateUser = async (userID) => {
  try {
    const response = await fetch(`http://localhost:5000/users/activateUser/${userID}`, {
      method: 'PUT',
    });

    if (!response.ok) {
      throw new Error('Failed to activate user');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Nodemailer For Contact Us
export const sendContactEmail = async (emailData) => {
  try {
    const response = await fetch('http://localhost:5000/contact_us', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    return response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Booking Request Notification
export const requestBooking = async (reservationID) => {
  try {
    const response = await fetch(`http://localhost:5000/requestBooking/${reservationID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send booking request');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Booking Accepted Notification
export const acceptBooking = async (reservationID) => {
  try {
    const response = await fetch(`http://localhost:5000/accept_booking/${reservationID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to accept booking');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Suggest New Room
export const suggestNewRoom = async (propertyID, reservationID) => {
  try {
    const response = await fetch(`http://localhost:5000/suggestNewRoom/${propertyID}/${reservationID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to suggest new room');
    }

    return await response.json();
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Property Listing Request Notification
export const propertyListingRequest = async (propertyID) => {
  try {
    const response = await fetch(`http://localhost:5000/propertyListingRequest/${propertyID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send property listing request');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Property Listing Request Accepted Notification
export const propertyListingAccept = async (propertyID) => {
  try {
    const response = await fetch(`http://localhost:5000/propertyListingAccept/${propertyID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send property listing request accepted notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Property Listing Request Notification
export const propertyListingReject = async (propertyID) => {
  try {
    const response = await fetch(`http://localhost:5000/propertyListingReject/${propertyID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send property listing request rejected notification');
    }

    return await response.json();
  }catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Send Suggest Notification 
export const sendSuggestNotification = async (reservationID, selectedOperators) => {
  try {
    const response = await fetch(`http://localhost:5000/sendSuggestNotification/${reservationID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIDs: selectedOperators,  
    }),
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send suggest notification');
    }

    return await response.json();
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};

// Store Reservation Data
export const createReservation = async (reservationData) => {
  try {

    const userID = localStorage.getItem('userID');
    
    if (!userID) {
      alert('User not logged in. Please log in to create a reservation.');
      return;
    }


    const reservationWithUserID = { ...reservationData, userID };


    const response = await fetch(`http://localhost:5000/reservation/${userID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservationWithUserID),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create reservation');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Fetch all Reservations
export const fetchReservation = async () => {
  try {
    // Retrieve the username from localStorage
    const username = localStorage.getItem('username');

    if (!username) {
      throw new Error('Username is not found in localStorage. Please log in.');
    }

    const response = await fetch(`http://localhost:5000/reservationTable?username=${encodeURIComponent(username)}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.reservations;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Update reservation status
export const updateReservationStatus = async (reservationID, status) => {
  try {
    const response = await fetch(`http://localhost:5000/updateReservationStatus/${reservationID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationStatus: status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update reservation status');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const fetchCart = async () => {
  try {
      const userID = localStorage.getItem('userID');
      const response = await fetch(`http://localhost:5000/cart?userID=${userID}`);
      if (!response.ok) {
          throw new Error('Failed to fetch reservations');
      }

      const data = await response.json();
      console.log('Fetched reservations:', data);
      return data.reservations;
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Cancel a reservation
export const cancelReservation = async (reservationID) => {
  try {
    const response = await fetch(`http://localhost:5000/cancelReservation/${reservationID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel reservation');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Remove Reservation
export const removeReservation = async (reservationID) => {
  try {
    const response = await fetch(`http://localhost:5000/removeReservation/${reservationID}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete reservation');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const fetchBookLog = async () => {
  try {
    const response = await fetch('http://localhost:5000/users/booklog');

    if (!response.ok) {
      throw new Error('Failed to fetch book logs');
    }

    const data = await response.json();


    return data; 
  } catch (error) {
    console.error('API error fetching book logs:', error);
    throw error;
  }
};

export const fetchFinance = async () => {
  try {
      const response = await fetch(`http://localhost:5000/users/finance`);
      const data = await response.json();
      return data; 
  } catch (error) {
      console.error('API error:', error);
      throw error;
  }
};

// Get Properties Of Administrator For "Suggest"
export const getOperatorProperties = async (userID) => {
  try {
    const response = await fetch(`http://localhost:5000/operatorProperties/${userID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if(!response) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get properties');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API error: ', error);
    throw error;
  }
};