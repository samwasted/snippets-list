import { useState, useEffect } from 'react';
import { Code2,Layout, LogIn, UserPlus, Eye, FileText } from 'lucide-react';
import axios from 'axios';

type Space = {
  name: string;
  description?: string;
  owner?: { username?: string };
  _count?: { snippets?: number };
  id?: number;
  totalViews: number;
};

const WelcomePage = () => {
  const [publicSpaces, setPublicSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicSpaces();
  }, []);

  const fetchPublicSpaces = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/v1/space/public');
      setPublicSpaces(response.data.spaces || []);
    } catch (err) {
      console.error('Error fetching spaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: any) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">SnippetSpace</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleNavigation('/login')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </button>
            <button
              onClick={() => handleNavigation('/signup')}
              className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Organize Your
            <span className="text-purple-600"> Code Snippets</span>
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Create spaces, store snippets, and keep your code organized
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleNavigation('/signup')}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium"
            >
              Get Started
            </button>
            <button
              onClick={() => handleNavigation('/login')}
              className="px-8 py-3 border-2 border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              Sign In
            </button>
          </div>
        </div>



        {/* Public Spaces */}
        <div className="bg-white/40 rounded-xl p-8 border border-purple-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Public Spaces
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : publicSpaces.length === 0 ? (
            <div className="text-center py-8">
              <Layout className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No public spaces yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4 min-w-max">
                {publicSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer min-w-[280px] flex-shrink-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Layout className="h-5 w-5 text-purple-600" />
                      <div className="flex items-center text-gray-500 text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {space.totalViews}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-800 mb-1">{space.name}</h4>
                    <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                      {space.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{space.owner?.username || 'Anonymous'}</span>
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {space._count?.snippets || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WelcomePage;