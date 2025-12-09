"use client";
import React, { useState } from 'react';

// --- Helper Functions ---

// Add days to a date string (YYYY-MM-DD) and return new string
const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Format date for display (e.g., "2023-09-06" -> "6/9")
// We parse the string manually to avoid Timezone "off-by-one" errors
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-'); // [YYYY, MM, DD]
  return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
};

export default function Timetable() {
  // --- State ---
  const [courses, setCourses] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null); // stores { courseId, lessonId }
  
  // Form State for creating new courses
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTime, setNewCourseTime] = useState('');
  const [newCourseDate, setNewCourseDate] = useState('');

  // --- Core Functions ---

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!newCourseName || !newCourseTime || !newCourseDate) return;

    // Generate 12 lessons automatically
    const lessons = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      // Increment start date by 7 days for each subsequent lesson
      dateStr: addDays(newCourseDate, i * 7),
      completed: false,
    }));

    const newCourse = {
      id: Date.now().toString(), // Simple unique ID
      name: newCourseName,
      timeSlot: newCourseTime,
      lessons,
    };

    setCourses([...courses, newCourse]);
    
    // Reset form
    setNewCourseName('');
    setNewCourseTime('');
    setNewCourseDate('');
  };

  const toggleCompletion = (courseId, lessonId) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      
      return {
        ...course,
        lessons: course.lessons.map(lesson => 
          // Toggle the boolean for the specific lesson
          lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
        )
      };
    }));
    setSelectedCell(null); // Close the popup menu
  };

  // The "Cascade" Date Shift Function
  // direction: 1 for next week (postpone), -1 for prev week (reverse)
  const shiftDates = (courseId, startLessonId, direction) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;

      // Logic: Find the lesson clicked...
      return {
        ...course,
        lessons: course.lessons.map(lesson => {
          // ...and shift it AND all lessons after it
          if (lesson.id >= startLessonId) {
            return {
              ...lesson,
              dateStr: addDays(lesson.dateStr, direction * 7)
            };
          }
          return lesson;
        })
      };
    }));
    setSelectedCell(null);
  };

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-gray-800">
      <h1 className="text-3xl font-bold text-center mb-8 tracking-wider">故事演講家 (TIMETABLE)</h1>

      {/* --- Add Course Form --- */}
      <div className="max-w-4xl mx-auto mb-10 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create New Course</h2>
        <form onSubmit={handleCreateCourse} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Course Name</label>
            <input 
              type="text" 
              placeholder="e.g. SPEC_C01" 
              className="px-3 py-2 border rounded border-gray-300 w-32"
              value={newCourseName}
              onChange={e => setNewCourseName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Slot</label>
            <input 
              type="text" 
              placeholder="SAT 14:00 - 15:25" 
              className="px-3 py-2 border rounded border-gray-300 w-48"
              value={newCourseTime}
              onChange={e => setNewCourseTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date (Lesson 1)</label>
            <input 
              type="date" 
              className="px-3 py-2 border rounded border-gray-300"
              value={newCourseDate}
              onChange={e => setNewCourseDate(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors"
          >
            Add Course
          </button>
        </form>
      </div>

      {/* --- Timetable Grid --- */}
      {courses.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 shadow-lg">
          <table className="min-w-full text-center text-sm border-collapse">
            <thead>
              {/* Row 1: Course Names */}
              <tr className="bg-white">
                <th className="p-4 border border-gray-200 w-24"></th>
                {courses.map(course => (
                  <th key={course.id} className="p-4 border border-gray-200 font-bold text-gray-800">
                    {course.name}
                  </th>
                ))}
              </tr>
              {/* Row 2: Time Slots */}
              <tr className="bg-white">
                <th className="p-4 border border-gray-200"></th>
                {courses.map(course => (
                  <th key={course.id} className="p-4 border border-gray-200 font-normal text-gray-500 text-xs">
                    {course.timeSlot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Rows: Lessons 1 to 12 */}
              {Array.from({ length: 12 }).map((_, rowIndex) => {
                const lessonNum = rowIndex + 1;
                return (
                  <tr key={lessonNum}>
                    {/* Lesson Label Column */}
                    <td className="p-3 border border-gray-200 font-bold bg-gray-50 text-gray-700 whitespace-nowrap">
                      Lesson {lessonNum.toString().padStart(2, '0')}
                    </td>

                    {/* Course Cells */}
                    {courses.map(course => {
                      const lesson = course.lessons.find(l => l.id === lessonNum);
                      if (!lesson) return <td key={course.id}></td>;

                      // Check if this specific cell is currently clicked
                      const isSelected = selectedCell?.courseId === course.id && selectedCell?.lessonId === lesson.id;

                      return (
                        <td 
                          key={course.id} 
                          className={`
                            relative p-3 border border-gray-200 cursor-pointer transition-colors
                            ${lesson.completed ? 'bg-[#98D896]' : 'bg-white hover:bg-gray-50'}
                          `}
                          onClick={() => setSelectedCell({ courseId: course.id, lessonId: lesson.id })}
                        >
                          <span className="font-medium text-gray-800">
                            {formatDateDisplay(lesson.dateStr)}
                          </span>

                          {/* Control Menu (Pop-up on Click) */}
                          {isSelected && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 w-48 bg-white shadow-xl rounded-md border border-gray-200 p-2 flex flex-col gap-2">
                              
                              {/* Toggle Completion Button */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleCompletion(course.id, lesson.id); }}
                                className={`text-xs p-2 rounded text-white font-bold ${lesson.completed ? 'bg-gray-400' : 'bg-green-500'}`}
                              >
                                {lesson.completed ? 'Mark Incomplete' : 'Mark Completed'}
                              </button>

                              <div className="h-px bg-gray-200 my-1"></div>
                              <p className="text-[10px] text-gray-400 font-semibold text-left px-1">SHIFT SCHEDULE</p>

                              {/* Date Shift Buttons */}
                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); shiftDates(course.id, lesson.id, -1); }}
                                  className="flex-1 text-xs py-1 px-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 border border-yellow-200"
                                >
                                  -1 Week
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); shiftDates(course.id, lesson.id, 1); }}
                                  className="flex-1 text-xs py-1 px-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 border border-blue-200"
                                >
                                  +1 Week
                                </button>
                              </div>
                              <div className="text-[10px] text-gray-400 italic">Affects all following lessons</div>
                            </div>
                          )}
                          
                          {/* Invisible backdrop to close menu when clicking outside */}
                          {isSelected && (
                            <div 
                              className="fixed inset-0 z-10 cursor-default" 
                              onClick={(e) => { e.stopPropagation(); setSelectedCell(null); }} 
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Empty State Hint */}
      {courses.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          Add a course above to generate the timetable.
        </div>
      )}
    </div>
  );
}
