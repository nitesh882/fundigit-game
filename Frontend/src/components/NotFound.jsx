import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-4">
      <div className="card-container text-center">
        <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-gaming-primary to-gaming-secondary text-transparent bg-clip-text">
          404
        </h2>
        <h3 className="text-2xl font-bold text-gray-200 mb-6">Page Not Found</h3>
        <p className="text-gray-400 mb-8 leading-relaxed max-w-md mx-auto">
          The page you are looking for has been destroyed, or never existed in the first place. Access denied!
        </p>
        <Link to="/" className="btn-primary inline-block text-lg px-8 py-3">
          Return to Base
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
