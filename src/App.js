import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Make sure this path is correct based on your project structure

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [address, setAddress] = useState('');
  const [places, setPlaces] = useState([]);
  const [imageDataUrl, setImageDataUrl] = useState(''); // State to hold the image data URL
  const [isImageClicked, setIsImageClicked] = useState(false);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    setSelectedImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUrl(reader.result); // Set the data URL to the imageDataUrl state
      };
      reader.readAsDataURL(file);
    }
  };
    const toggleImageVisibility = () => {
      setIsImageClicked(!isImageClicked);
    };
  

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedImage) {
      alert('Please select an image first!');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(selectedImage);
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const response = await axios.post('http://8.12.5.48:11434/api/generate', {
          model: 'llava:7b-v1.6-mistral-q5_K_M',
          prompt: 'You are an expert doctor. What is in this picture? Suggest what the person might do to cure of the injury shown in the image',
          stream: true,
          images: [base64],
        }, { headers: { 'Content-Type': 'application/json' } });

        const predictionText = response.data.trim().split('\n')
          .map(line => {
            try {
              return JSON.parse(line).response;
            } catch (error) {
              console.error('Error parsing JSON:', line, error);
              return '';
            }
          }).join('');

        setPrediction(predictionText);
      } catch (error) {
        console.error('Error uploading the image: ', error);
        alert('Failed to get prediction. Please try again.');
      }
    };
    reader.onerror = error => console.log(error);
  };
    const geocodeAddress = async () => {
      console.log('Starting geocode for address:', address);
      if (!address) {
        alert('Please enter an address.');
        return;
      }

      const apiKey = 'API-key'; // Replace with your Google Maps API Key
      try {
        const geocodeResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
        const { lat, lng } = geocodeResponse.data.results[0].geometry.location;
        searchNearbyDoctors(lat, lng);
      } catch (error) {
        console.error('Error geocoding the address: ', error);
        alert('Failed to geocode address. Please try again.');
      }
    };

  const searchNearbyDoctors = async (latitude, longitude) => {
    console.log('Starting search for nearby doctors...');

    if (!latitude || !longitude) {
      alert('Please enter both latitude and longitude.');
      return;
    }
    
    const apiKey = 'AIzaSyBGFCXOS0At4PAHkpzotnTsyVCe62-8Mlg'; // Make sure to replace this with your actual Google Maps API key
    const data = {
      includedTypes: ["hospital"],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          },
          radius: 5000 // Adjust this value if necessary
        }
      }
    };

    console.log(`Sending request with data: ${JSON.stringify(data)}`);

    try {
      const response = await axios.post('https://places.googleapis.com/v1/places:searchNearby', data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.displayName,places.location', // Add this line
          'X-Goog-Api-Key': apiKey
        }
      });

      console.log('Response received:', response.data); // Log the response data to inspect its structure

      // Since the data is under the 'places' key, let's use that instead of 'results'
      const placesData = response.data.places; // This should match the actual structure of your response

      if (!Array.isArray(placesData)) {
        console.error('The places data is not an array:', placesData);
        throw new Error('Invalid places data structure');
      }

      const places = response.data.places.map(place => ({
        displayName: place.displayName.text, // Extract the text from the displayName object
        latitude: place.location.latitude,
        longitude: place.location.longitude
      }));
      
      console.log('Processed places:', places);
      setPlaces(places);
    } catch (error) {
      console.error('Error searching for doctors:', error);

      alert('Failed to search for doctors. Please try again.');
    }
};

return (
<div className="docubot-ai-medical-advisor">
  <div className="header">
    <h1>Docubot : AI Medical Advisor</h1>
  </div>

  <div className="upload-section">
    <form onSubmit={handleSubmit} className="upload-form">
      <label htmlFor="image-upload" className="upload-label">
        Choose an Image
      </label>
      <input
        type="file"
        id="image-upload"
        onChange={handleImageChange}
        accept="image/*"
        className="upload-input"
      />
      <button type="submit" className="predict-button">Analyze Image</button>
    </form>
  </div>

  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
    {imageDataUrl && (
      <div className="image-preview" style={{ flex: 1 }}>
        <h2>Image Preview</h2>
        <img src={imageDataUrl} alt="Uploaded" className="uploaded-image" style={{ maxWidth: '100%', maxHeight: '450px' }} />
      </div>
    )}

    {prediction && (
      <div className="prediction-section" style={{ flex: 1 }}>
        <h2 >Prediction Results</h2>
        <p className="prediction-text">{prediction}</p>
      </div>
    )}

    {prediction && (
      <div style={{ marginTop: '68px', display: 'flex', alignItems: 'flex-start',flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address"
          className="address-input"
          style={{ width: '100%' }}
        />
        <button onClick={geocodeAddress} className="find-doctors-button" style={{ width: '100%' }}>Locate Doctors</button>
        {places.length > 0 && (
        <div className="doctors-list">
          <h3>Doctors Near You:</h3>
          <ul className="list">
            {places.map((place, index) => (
              <li key={index} className="list-item">{place.displayName}</li>
            ))}
          </ul>
        </div>
  )}

      </div>
    )}
  </div>
    

</div>
);
}

export default App;
