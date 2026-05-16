import React, { useState } from 'react';

const NurseInputPage = ({ isEmbedded = false }) => {
  const [actionType, setActionType] = useState('used'); // 'used' or 'added'
  const [quantity, setQuantity] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [beaconResponse, setBeaconResponse] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const presetCommands = [
    "We just used five ventilators.",
    "Our mask count is low.",
    "Add twenty boxes of gloves.",
    "We need more N95 masks."
  ];

  const handleStartRecording = () => {
    if (isRecording) {
      // stop recording
      setIsRecording(false);
      setIsLoading(true);
      // Simulate backend processing
      setTimeout(() => {
        setIsLoading(false);
        setTranscript("We just used five ventilators.");
        setBeaconResponse("Got it. I've updated the inventory: 5 ventilators used. Your stock is now low, so I'm routing more from Mercy Hospital.");
      }, 2000);
    } else {
      setIsRecording(true);
      setTranscript("");
      setBeaconResponse(null);
    }
  };

  const handlePresetCommand = (command) => {
    if (isRecording) setIsRecording(false);
    setTranscript(command);
    setIsLoading(true);
    setBeaconResponse(null);

    // Simulate backend processing
    setTimeout(() => {
      setIsLoading(false);
      setBeaconResponse("Got it. I've updated the inventory based on your command.");
    }, 2000);
  };

  const handlePlayResponse = () => {
    setIsPlaying(true);
    // Simulate playing audio
    setTimeout(() => {
      setIsPlaying(false);
    }, 3000);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-surface-bright ${isEmbedded ? '' : 'h-screen'}`}>
      <header className="flex-shrink-0 px-6 md:px-10 py-8 border-b border-outline-variant bg-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Rapid Input</span>
          <span className="text-on-surface-variant font-medium text-xs">Nurse Station</span>
        </div>
        <h2 className="text-3xl font-bold text-on-surface">Update Inventory</h2>
        <p className="text-sm text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
          Log supply usage or new deliveries. For hands-free updates, use the autonomous voice command system.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Manual Input Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_document</span>
                Manual Entry
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Supply Item</label>
                  <div className="relative">
                    <select className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-4 pr-10 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer">
                      <option value="">Select Item...</option>
                      <option value="ventilators">Ventilators (Portable)</option>
                      <option value="masks">N95 Masks</option>
                      <option value="gloves">Surgical Gloves (Boxes)</option>
                      <option value="blood-o-neg">O-Negative Blood (Units)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Action</label>
                    <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant">
                      <button
                        onClick={() => setActionType('used')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${actionType === 'used' ? 'bg-white shadow-sm text-error' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        Used
                      </button>
                      <button
                        onClick={() => setActionType('added')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${actionType === 'added' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                      >
                        Added
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-container mt-6">
                  <button className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:opacity-90 transition-all flex justify-center items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    Submit Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Command Demo */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">mic</span>
                    Voice Assistant
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-500/70 uppercase tracking-widest mt-1">Autonomous Logging</p>
                </div>
                <button 
                  onClick={handleStartRecording}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform ${isRecording ? 'bg-error text-white animate-pulse scale-105' : 'bg-primary text-white hover:scale-105 active:scale-95 group-hover:animate-pulse'}`}
                >
                  <span className="material-symbols-outlined text-3xl">{isRecording ? 'stop' : 'mic'}</span>
                </button>
              </div>

              <p className="text-sm text-indigo-800/80 mb-6 leading-relaxed">
                Tap the microphone icon or say <strong>"Hey Beacon"</strong> to quickly log inventory changes while your hands are full.
              </p>

              {/* Status Display */}
              {(isRecording || isLoading || transcript || beaconResponse) && (
                <div className="mb-6 bg-white rounded-xl p-4 border border-indigo-100 shadow-inner">
                  {isRecording && (
                    <div className="flex items-center gap-2 text-error font-medium animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-error"></div>
                      Listening...
                    </div>
                  )}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                      Processing voice input...
                    </div>
                  )}
                  {transcript && !isRecording && !isLoading && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">You said:</p>
                      <p className="text-sm text-on-surface italic">"{transcript}"</p>
                    </div>
                  )}
                  {beaconResponse && !isLoading && (
                    <div className="mt-3 pt-3 border-t border-indigo-50">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Beacon Response:</p>
                      <p className="text-sm text-indigo-900 font-medium mb-3">{beaconResponse}</p>
                      <button 
                        onClick={handlePlayResponse}
                        className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${isPlaying ? 'bg-primary/20 text-primary' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isPlaying ? 'volume_up' : 'play_arrow'}
                        </span>
                        {isPlaying ? 'Playing...' : 'Play Response'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Try saying...</p>

                {presetCommands.map((cmd, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handlePresetCommand(cmd)}
                    className="bg-white border border-indigo-100 rounded-xl p-3 shadow-sm hover:border-primary/40 cursor-pointer transition-colors flex gap-3 items-center"
                  >
                    <span className="material-symbols-outlined text-indigo-300">chat</span>
                    <p className="text-sm font-medium text-indigo-900">“{cmd}”</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default NurseInputPage;
