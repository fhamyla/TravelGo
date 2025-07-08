# TravelGo

TravelGo is a web-based travel platform designed to help users plan, book, and manage their travel experiences. The project features a user-friendly interface, contact form, and visually appealing assets to enhance the travel planning process.

## Features
- **Modern UI**: Clean and responsive design for seamless user experience.
- **Contact Form**: Easily get in touch for inquiries or support.
- **Rich Media**: Includes a variety of travel-related images and icons.
- **Static Frontend**: Built with HTML, CSS, and JavaScript for fast performance.
- **Node.js Backend**: Handles form submissions and server-side logic.

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd TravelGo
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
   If you want to work with the contact form specifically, navigate to the `contact-form` directory and install dependencies there as well:
   ```bash
   cd contact-form
   npm install
   cd ..
   ```

## Usage

1. **Start the server:**
   ```bash
   node server.js
   ```
2. **Open your browser:**
   Navigate to `http://localhost:3000` (or the port specified in your `server.js`).

## Folder Structure

```
TravelGo/
  ├── contact-form/         # Contact form backend (Node.js)
  ├── icons/                # Icon assets for UI
  ├── img/                  # Image assets for UI
  ├── index.html            # Main HTML file
  ├── script.js             # Frontend JavaScript
  ├── style.css             # Main stylesheet
  ├── server.js             # Node.js server
  ├── package.json          # Project metadata and dependencies
  └── README.md             # Project documentation
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.