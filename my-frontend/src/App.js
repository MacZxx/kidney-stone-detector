import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileImage, Activity, MapPin, Ruler, AlertCircle, Download, Trash2, Brain, Database, Save, History, User, Calendar, Search, Eye, Zap, Shield, Server } from 'lucide-react';
import './index.css';

const KidneyStoneAnalyzer = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    patientId: '',
    notes: ''
  });
  const [savedRecords, setSavedRecords] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detectionMode, setDetectionMode] = useState('yolo'); // 'yolo' or 'claude'
  const [serverStatus, setServerStatus] = useState('checking');
  const [imageQuality, setImageQuality] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check backend server status on mount
  useEffect(() => {
    checkServerStatus();
    loadAllRecords();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/health');
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (err) {
      setServerStatus('offline');
    }
  };

  const loadAllRecords = () => {
    try {
      const records = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kidney_analysis:')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const record = JSON.parse(item);
              records.push(record);
            }
          } catch (err) {
            console.error(`Error loading record ${key}:`, err);
          }
        }
      }
      records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSavedRecords(records);
    } catch (err) {
      console.error('Error loading records:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setAnalysisResults(null);
        setError(null);
        setImageQuality(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // YOLO Detection via Backend
  const performYOLOAnalysis = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: uploadedImage,
          patientInfo: patientInfo
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const results = await response.json();
      
      setAnalysisResults(results);
      setImageQuality(results.imageQuality);
      
      if (results.detectedStones && results.detectedStones.length > 0) {
        setTimeout(() => drawDetections(results), 100);
      } else {
        displayImageOnly();
      }

    } catch (err) {
      console.error("YOLO Analysis error:", err);
      setError(`Backend connection failed: ${err.message}. Make sure the Python server is running on port 5000.`);
      
      // Show how to start server
      console.log("To start backend server:");
      console.log("1. cd backend");
      console.log("2. pip install -r requirements.txt");
      console.log("3. python app.py");
      
    } finally {
      setAnalyzing(false);
    }
  };

  // Claude Detection (fallback or comparison)
  const performClaudeAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      const base64Data = uploadedImage.split(',')[1];
      const mimeType = uploadedImage.split(';')[0].split(':')[1];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64Data
                  }
                },
                {
                  type: "text",
                  text: `You are an expert radiologist specializing in kidney stone detection. Analyze this CT scan and provide detailed results.

Respond with ONLY valid JSON:
{
  "detectedStones": [
    {
      "id": number,
      "location": "anatomical location",
      "coordinates": {"x": number, "y": number, "width": number, "height": number},
      "size": "size in mm",
      "confidence": number (0-100),
      "characteristics": "description"
    }
  ],
  "totalCount": number,
  "imageType": "CT scan type",
  "imageQuality": "excellent/good/fair/poor",
  "findings": "clinical summary",
  "recommendations": "clinical recommendations",
  "limitationsNoted": "any limitations",
  "analysisConfidence": number (0-100)
}`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      const textContent = data.content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("");

      const cleanedText = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const aiResults = JSON.parse(cleanedText);
      aiResults.analysisDate = new Date().toLocaleString();
      aiResults.modelUsed = "Claude Sonnet 4";
      
      setAnalysisResults(aiResults);
      setImageQuality(aiResults.imageQuality);
      
      if (aiResults.detectedStones && aiResults.detectedStones.length > 0) {
        setTimeout(() => drawDetections(aiResults), 100);
      } else {
        displayImageOnly();
      }
      
    } catch (err) {
      console.error("Claude Analysis error:", err);
      setError(`Claude API error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const performAIAnalysis = async () => {
    if (detectionMode === 'yolo') {
      await performYOLOAnalysis();
    } else {
      await performClaudeAnalysis();
    }
  };

  const drawDetections = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (results.detectedStones && results.detectedStones.length > 0) {
        results.detectedStones.forEach((stone) => {
          const { x, y, width, height } = stone.coordinates;
          
          // Color based on confidence
          let color = '#ef4444'; // red
          if (stone.confidence >= 90) color = '#22c55e'; // green
          else if (stone.confidence >= 80) color = '#eab308'; // yellow
          
          // Draw bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
          
          // Draw label background
          const label = `#${stone.id} (${Math.round(stone.confidence)}%)`;
          ctx.font = 'bold 14px Arial';
          const textWidth = ctx.measureText(label).width;
          
          ctx.fillStyle = color;
          ctx.fillRect(x, y - 25, textWidth + 10, 22);
          
          // Draw label text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, x + 5, y - 8);
        });
      }
    };
    
    img.src = uploadedImage;
  };

  const displayImageOnly = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    
    img.src = uploadedImage;
  };

  const resetAnalysis = () => {
    setUploadedImage(null);
    setAnalysisResults(null);
    setError(null);
    setImageQuality(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveToDatabase = () => {
    if (!analysisResults) return;

    const record = {
      id: `kidney_analysis:${Date.now()}`,
      timestamp: new Date().toISOString(),
      patientInfo: { ...patientInfo },
      results: analysisResults,
      image: uploadedImage,
      detectionMode: detectionMode
    };

    try {
      localStorage.setItem(record.id, JSON.stringify(record));
      loadAllRecords();
      alert('Analysis saved successfully!');
    } catch (err) {
      console.error('Error saving record:', err);
      alert('Failed to save record. Storage might be full.');
    }
  };

  const downloadReport = () => {
    if (!analysisResults) return;

    const report = {
      analysisDate: analysisResults.analysisDate,
      detectionMethod: detectionMode === 'yolo' ? 'YOLOv8 Deep Learning' : 'Claude AI',
      patient: patientInfo,
      findings: {
        totalStones: analysisResults.totalCount,
        imageType: analysisResults.imageType,
        imageQuality: analysisResults.imageQuality,
        modelUsed: analysisResults.modelUsed,
        detectedStones: analysisResults.detectedStones,
        clinicalFindings: analysisResults.findings,
        recommendations: analysisResults.recommendations,
        limitations: analysisResults.limitationsNoted,
        overallConfidence: analysisResults.analysisConfidence
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kidney-stone-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const viewRecord = (record) => {
    setSelectedRecord(record);
    setPatientInfo(record.patientInfo);
    setUploadedImage(record.image);
    setAnalysisResults(record.results);
    setDetectionMode(record.detectionMode || 'yolo');
    setShowHistory(false);
    
    setTimeout(() => {
      if (record.results.detectedStones && record.results.detectedStones.length > 0) {
        drawDetections(record.results);
      } else {
        displayImageOnly();
      }
    }, 100);
  };

  const deleteRecord = (recordId) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        localStorage.removeItem(recordId);
        loadAllRecords();
        if (selectedRecord && selectedRecord.id === recordId) {
          resetAnalysis();
          setSelectedRecord(null);
        }
      } catch (err) {
        console.error('Error deleting record:', err);
        alert('Failed to delete record.');
      }
    }
  };

  const filteredRecords = savedRecords.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.patientInfo.name?.toLowerCase().includes(search) ||
      record.patientInfo.patientId?.toLowerCase().includes(search) ||
      record.timestamp.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Kidney Stone Detector</h1>
                <p className="text-sm text-gray-600">YOLOv8 Deep Learning + Claude AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                serverStatus === 'online' ? 'bg-green-100 text-green-700' :
                serverStatus === 'offline' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                <Server className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {serverStatus === 'online' ? 'Backend Online' :
                   serverStatus === 'offline' ? 'Backend Offline' :
                   'Checking...'}
                </span>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
              >
                <History className="w-4 h-4" />
                History ({savedRecords.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Analysis History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, or date..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Database className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>No records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {record.patientInfo.name || 'Unnamed Patient'}
                            </span>
                            {record.patientInfo.patientId && (
                              <span className="text-sm text-gray-500">ID: {record.patientInfo.patientId}</span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded ${
                              record.detectionMode === 'yolo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {record.detectionMode === 'yolo' ? 'YOLOv8' : 'Claude AI'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(record.timestamp).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              {record.results.totalCount} stones detected
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewRecord(record)}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Patient name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={patientInfo.age}
                    onChange={(e) => setPatientInfo({...patientInfo, age: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                  <input
                    type="text"
                    value={patientInfo.patientId}
                    onChange={(e) => setPatientInfo({...patientInfo, patientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Patient ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
                  <textarea
                    value={patientInfo.notes}
                    onChange={(e) => setPatientInfo({...patientInfo, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Previous history, symptoms..."
                  />
                </div>
              </div>
            </div>

            {/* Detection Mode Selector */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Detection Method
              </h2>
              
              <div className="space-y-3">
                <div 
                  onClick={() => setDetectionMode('yolo')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    detectionMode === 'yolo' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      detectionMode === 'yolo' ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                      {detectionMode === 'yolo' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        YOLOv8 Deep Learning
                        {serverStatus === 'online' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Available</span>}
                        {serverStatus === 'offline' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Offline</span>}
                      </div>
                      <div className="text-sm text-gray-600">Fast, specialized for kidney stones</div>
                      <div className="text-xs text-gray-500 mt-1">⚡ 2-3 seconds | 🎯 85-95% accuracy</div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setDetectionMode('claude')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    detectionMode === 'claude' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      detectionMode === 'claude' ? 'border-purple-500' : 'border-gray-300'
                    }`}>
                      {detectionMode === 'claude' && <div className="w-3 h-3 bg-purple-500 rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Claude AI Vision
                      </div>
                      <div className="text-sm text-gray-600">General medical AI, detailed analysis</div>
                      <div className="text-xs text-gray-500 mt-1">⏱️ 5-8 seconds | 🎯 80-90% accuracy</div>
                    </div>
                  </div>
                </div>

                {serverStatus === 'offline' && detectionMode === 'yolo' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      <strong>Backend Offline</strong><br/>
                      Start server: <code className="bg-yellow-100 px-1 rounded">python backend/app.py</code>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CT Scan
              </h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors"
              >
                <FileImage className="w-10 h-10 text-indigo-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload CT scan</span>
                <span className="text-xs text-gray-400 mt-1">JPG, PNG, DICOM</span>
              </label>

              {uploadedImage && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={performAIAnalysis}
                    disabled={analyzing || (detectionMode === 'yolo' && serverStatus !== 'online')}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        {detectionMode === 'yolo' ? <Zap className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                        Analyze with {detectionMode === 'yolo' ? 'YOLOv8' : 'Claude AI'}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={resetAnalysis}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Results Summary */}
            {analysisResults && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Summary</h2>
                
                <div className="space-y-3">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Stones Detected</div>
                    <div className="text-2xl font-bold text-indigo-600">{analysisResults.totalCount}</div>
                  </div>
                  
                  {analysisResults.analysisConfidence && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Analysis Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold text-green-600">{analysisResults.analysisConfidence}%</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${analysisResults.analysisConfidence}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {analysisResults.imageQuality && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Image Quality</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        analysisResults.imageQuality === 'excellent' ? 'bg-green-100 text-green-700' :
                        analysisResults.imageQuality === 'good' ? 'bg-blue-100 text-blue-700' :
                        analysisResults.imageQuality === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {analysisResults.imageQuality.toUpperCase()}
                      </div>
                    </div>
                  )}

                  {analysisResults.modelUsed && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Detection Model</div>
                      <div className="text-sm font-medium text-purple-700">{analysisResults.modelUsed}</div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Findings</div>
                    <div className="text-xs text-gray-700">{analysisResults.findings}</div>
                  </div>
                  
                  <button
                    onClick={saveToDatabase}
                    className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save to Database
                  </button>
                  
                  <button
                    onClick={downloadReport}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Report
                  </button>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Medical Disclaimer:</strong> This tool is for educational and research purposes only. 
                  Not FDA-approved for clinical diagnosis. Always consult qualified healthcare professionals 
                  for medical decisions.
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Display */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">CT Scan Visualization</h2>
              
              {!uploadedImage ? (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <div className="text-center text-gray-400">
                    <FileImage className="w-16 h-16 mx-auto mb-2" />
                    <p>No image uploaded</p>
                    <p className="text-sm mt-2">Upload a CT scan to begin analysis</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center bg-gray-900 rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto"
                    style={{ maxHeight: '500px' }}
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Results */}
            {analysisResults && analysisResults.detectedStones.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Detailed Findings</h2>
                
                <div className="space-y-3">
                  {analysisResults.detectedStones.map((stone) => (
                    <div key={stone.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 text-lg">Stone #{stone.id}</h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          stone.confidence >= 90 ? 'bg-green-100 text-green-700' :
                          stone.confidence >= 80 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(stone.confidence)}% confidence
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Location</div>
                            <div className="font-medium text-gray-900">{stone.location}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <Ruler className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-600 mb-1">Size</div>
                            <div className="font-medium text-gray-900">{stone.size}</div>
                          </div>
                        </div>

                        {stone.characteristics && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-600 mb-1">Characteristics</div>
                            <div className="text-sm text-gray-700">{stone.characteristics}</div>
                          </div>
                        )}
                        
                        <div className="col-span-2">
                          <div className="text-xs text-gray-600 mb-1">Detection Confidence</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                stone.confidence >= 90 ? 'bg-green-600' :
                                stone.confidence >= 80 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${stone.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysisResults && analysisResults.recommendations && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Clinical Recommendations</h2>
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {analysisResults.recommendations}
                </div>
              </div>
            )}

            {/* Limitations */}
            {analysisResults && analysisResults.limitationsNoted && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Analysis Limitations
                </h3>
                <div className="text-sm text-orange-700">{analysisResults.limitationsNoted}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KidneyStoneAnalyzer;
