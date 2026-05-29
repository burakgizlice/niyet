// Block 17 (C4): convenience re-export so consumers import the hook from
// hooks/useAuth.js without reaching into the context module. The provider and
// the hook both live in src/context/AuthContext.jsx.
export { useAuth } from '../context/AuthContext'
