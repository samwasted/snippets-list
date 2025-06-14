import { Code2, Sparkles, ArrowRight } from 'lucide-react';

const WelcomePage = () => {
  const handleJoin = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large floating triangle */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 transform rotate-45 animate-pulse"></div>
        
        {/* Floating circles */}
        <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-indigo-400/30 to-purple-400/30 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '3s'}}></div>
        
        <div className="absolute bottom-1/3 left-1/5 w-16 h-16 bg-gradient-to-r from-pink-400/25 to-purple-400/25 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
        
        {/* Hexagon shapes */}
        <div className="absolute top-1/2 right-10 w-20 h-20 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 transform rotate-12 clip-hexagon animate-spin" style={{animationDuration: '8s'}}></div>
        
        {/* Diamond shape */}
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-purple-400/15 to-indigo-400/15 transform rotate-45 animate-pulse" style={{animationDelay: '1.5s'}}></div>
        
        {/* Small floating squares */}
        <div className="absolute top-1/3 left-1/2 w-12 h-12 bg-gradient-to-br from-pink-400/30 to-purple-400/30 transform rotate-12 animate-bounce" style={{animationDelay: '3s', animationDuration: '4s'}}></div>
        
        <div className="absolute bottom-1/4 left-1/3 w-10 h-10 bg-gradient-to-r from-indigo-400/25 to-purple-400/25 transform -rotate-12 animate-ping" style={{animationDelay: '0.5s'}}></div>
        
        {/* Large background circle */}
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full animate-pulse" style={{animationDuration: '6s'}}></div>
        
        {/* Floating pentagon */}
        <div className="absolute top-3/4 left-10 w-18 h-18 bg-gradient-to-br from-purple-400/20 to-pink-400/20 clip-pentagon animate-spin" style={{animationDuration: '10s', animationDelay: '2s'}}></div>
      </div>

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>



      {/* Main Content */}
      <main className="relative z-40 max-w-6xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-block p-4 bg-white/10 rounded-full mb-8 backdrop-blur-sm">
            <Code2 className="h-16 w-16 text-purple-300" />
          </div>
          
          <h2 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Organize Your
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Code Snippets
            </span>
          </h2>
          
          <p className="text-xl text-purple-200 mb-12 max-w-2xl mx-auto leading-relaxed">
            Create beautiful spaces, store your code snippets, and keep everything organized in one magical place
          </p>
          
          <div className="flex justify-center">
            <button
              onClick={handleJoin}
              className="group px-12 py-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 font-semibold text-xl shadow-2xl hover:shadow-purple-500/25"
            >
              <span className="flex items-center space-x-3">
                <Sparkles className="h-6 w-6" />
                <span>Join Now</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-300/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl w-fit mb-4">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Smart Organization</h3>
            <p className="text-purple-200">Create custom spaces and categories to keep your code snippets perfectly organized and easy to find.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-300/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl w-fit mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Beautiful Interface</h3>
            <p className="text-purple-200">Enjoy a clean, modern interface designed to make coding more delightful and productive.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-300/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl w-fit mb-4">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Quick Access</h3>
            <p className="text-purple-200">Access your snippets instantly with powerful search and intuitive navigation features.</p>
          </div>
        </div>
      </main>

      <style>{`
        .clip-hexagon {
          clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
        }
        .clip-pentagon {
          clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default WelcomePage;