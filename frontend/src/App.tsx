import React, { useState, KeyboardEvent, FormEvent } from 'react'; // Added useRef, KeyboardEvent, FormEvent
import { JSX } from 'react'; // Keep your explicit JSX import
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';

// Define the structure for the result display
type ResultType = {
  message: string;
  prediction?: string; // Optional: only present if prediction was successful
  confidence?: number; // Optional: only present if prediction was successful
  style: string; // Tailwind classes for styling the result box
  icon: JSX.Element; // React component for the icon
};

function App() {
  // State for the input text area
  const [text, setText] = useState('');
  // State to hold the analysis result (or null if no analysis yet)
  const [result, setResult] = useState<ResultType | null>(null);
  // State to manage the loading indicator
  const [loading, setLoading] = useState(false);
  // Ref for the form element (to manually trigger submit) - Optional but clean
  // const formRef = useRef<HTMLFormElement>(null);

  // Function to handle form submission and call the backend API
  // Changed type from React.FormEvent<HTMLFormElement> to allow calling without a real form event
  async function analyzeText(e?: FormEvent<HTMLFormElement>) {
    if (e) {
      e.preventDefault(); // Prevent default form submission page reload if called by form
    }

    // Don't proceed if already loading or text is empty
    if (loading || !text.trim()) {
        return;
    }

    setLoading(true); // Show loading indicator
    setResult(null); // Clear previous results

    try {
      // Send the text to the backend prediction endpoint
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }), // Send text in JSON body
      });

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the JSON response from the backend
      const data = await response.json();
      const prediction = data.prediction;
      const confidence = data.confidence;

      // Determine the result message, style, and icon based on the prediction
      const resultData: ResultType =
        prediction === 'sensitive'
          ? {
              message: '❌ Action blocked: You cannot share sensitive data.',
              prediction,
              confidence,
              style: 'bg-red-100 text-red-800 border-red-300', // Red theme for sensitive
              icon: <XCircleIcon className="h-6 w-6 mr-2 text-red-600" />,
            }
          : {
              message: '✅ Action allowed: Non-sensitive data.',
              prediction,
              confidence,
              style: 'bg-green-100 text-green-800 border-green-300', // Green theme for non-sensitive
              icon: <CheckCircleIcon className="h-6 w-6 mr-2 text-green-600" />,
            };

      // Update the result state
      setResult(resultData);

    } catch (error) {
      console.error('Error analyzing text:', error); // Log the error
      // Show an error message to the user
      setResult({
        message:
          '⚠️ Error analyzing text. Could not connect to the server or process the request.',
        style: 'bg-yellow-100 text-yellow-800 border-yellow-300', // Yellow theme for error
        icon: (
          <ExclamationCircleIcon className="h-6 w-6 mr-2 text-yellow-500" />
        ),
      });
    } finally {
      // Hide the loading indicator regardless of success or failure
      setLoading(false);
    }
  }

  // Function to handle key down events in the textarea
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Check if Enter key is pressed WITHOUT the Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent adding a new line
      analyzeText(); // Trigger the analysis function
      // Alternatively, if you prefer using the form's native submit:
      // formRef.current?.requestSubmit();
    }
    // If Shift+Enter is pressed, the default behavior (new line) will occur
  };

  // Render the component UI
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Context-Aware DLP POC
        </h1>

        {/* Form for text input and submission */}
        {/* Added ref={formRef} if using formRef.current?.requestSubmit() */}
        <form onSubmit={analyzeText}>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Paste your text here to check if it's sensitive... (Press Enter to analyze, Shift+Enter for new line)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown} // Added keydown handler
            rows={6}
            disabled={loading} // Disable textarea while loading
          />
          <button
            type="submit"
            disabled={loading || !text.trim()} // Disable button if loading or text is empty/whitespace
            className={`w-full text-white py-3 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading || !text.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Analyzing...' : 'Analyze Text'}
          </button>
        </form>

        {/* Loading Indicator */}
        {loading && (
          // ... (loading indicator JSX remains the same)
           <div className="mt-6 flex items-center justify-center text-blue-600">
            <svg
              className="animate-spin h-5 w-5 mr-3 text-blue-600" // Added mr-3 for spacing
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Analyzing text...
          </div>
        )}

        {/* Result Display Area */}
        {result && (
           // ... (result display JSX remains the same)
           <div
            className={`mt-6 p-4 border rounded-md flex items-start ${result.style}`}
            role="alert" // Add role for accessibility
          >
            <div className="flex-shrink-0">{result.icon}</div>
            <div className="ml-3"> {/* Added ml-3 for spacing */}
              <p className="font-semibold">{result.message}</p>
              {/* Conditionally render prediction details if they exist */}
              {typeof result.prediction !== 'undefined' && typeof result.confidence !== 'undefined' && (
                <p className="text-sm mt-1">
                  Prediction: <span className="font-medium">{result.prediction}</span> |
                  Confidence: <span className="font-medium">{(result.confidence * 100).toFixed(1)}%</span>
                </p>
              )}
               {/* Display more specific error if prediction details are missing (likely an error case) */}
               {typeof result.prediction === 'undefined' && result.message.includes('Error') && (
                 <p className="text-sm mt-1">Check console for more details.</p>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Footer/Info */}
      {/* ... (footer JSX remains the same) */}
       <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>This demo uses a model to classify text. Accuracy may vary.</p>
        <p>Do not enter real sensitive information into public demos.</p>
      </footer>
    </div>
  );
}

export default App;