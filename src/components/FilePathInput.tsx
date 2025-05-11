// import React, { useState } from 'react';
// import { File } from 'lucide-react';
// 
//  interface FilePathInputProps {
//   type: 'city' | 'helperRobot' | 'character';
 //  characterName?: string;
//   onPathSet: (path: string) => void;
// }
// 
// const FilePathInput: React.FC<FilePathInputProps> = ({ type, characterName, onPathSet }) => {
 //  const [path, setPath] = useState('');
//   
//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (path.trim()) {
//       onPathSet(path.trim());
 //    }
//   };
//   
//   const getTitle = () => {
 //    switch (type) {
//       case 'city':
//         return 'City Model Path';
 //      case 'helperRobot':
 //        return 'Helper Robot Model Path';
//       case 'character':
 //        return `${characterName} Model Path`;
 //      default:
 //        return 'Model Path';
 //    }
 //  };
//   
//   const getDescription = () => {
//     switch (type) {
//       case 'city':
//         return 'Enter the path to your city .glb file';
//       case 'helperRobot':
//         return 'Enter the path to your helper robot .glb file';
//       case 'character':
 //        return `Enter the path to the ${characterName} character .glb file`;
 //      default:
 //        return 'Enter the path to your .glb file';
 //    }
 //  };
//   
//   return (
//     <div className="bg-white rounded-lg shadow-md p-4 mb-4">
//       <h3 className="font-medium text-gray-800 mb-2">{getTitle()}</h3>
//       <p className="text-sm text-gray-500 mb-3">{getDescription()}</p>
 //      
//       <form onSubmit={handleSubmit} className="flex">
 //        <div className="relative flex-1">
 //          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//             <File size={16} className="text-gray-400" />
 //          </div>
//           <input
//             type="text"
//             value={path}
 //            onChange={(e) => setPath(e.target.value)}
//             className="pl-10 w-full p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
//             placeholder="/path/to/model.glb"
//           />
//         </div>
//         <button
//           type="submit"
//           className="bg-blue-500 text-white py-2 px-4 rounded-r-md hover:bg-blue-600 transition"
//         >
//           Set
//         </button>
//       </form>
//       
//       <div className="mt-2 text-xs text-gray-400">
//         Example: /models/city.glb or https://example.com/models/character.glb
//       </div>
 //    </div>
 //  );
// };
// 
// export default FilePathInput;