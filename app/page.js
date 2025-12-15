"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/firebase'; 
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// --- HELPER FUNCTIONS ---

const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
};

// --- DEFAULT LESSON NAMES ---
const DEFAULT_LESSON_NAMES = [
  "故事起航 - 認識自我與舞台",
  "句子結構大師 - 清晰表達",
  "圖片說故事 - Show and Tell",
  "禮儀小達人 - 優雅與尊重",
  "故事結構大挑戰 - 圖卡排序",
  "故事連貫大師 - 連接詞應用",
  "形容詞魔法 - 豐富故事描述",
  "故事與情感 - 聲音與表情",
  "創意故事編織 - 想像力啟動",
  "即興創作 - 快速應變",
  "創意畫作分享 - 繪畫與內心表達",
  "故事演講家 - 學習成果演示"
];

export default function AdminTimetable() {
  // --- STATE ---
  const [courses, setCourses] = useState([]);
  const [allStudentCodes, setAllStudentCodes] = useState([]); // Loaded from 'entries'
  const [selectedCell, setSelectedCell] = useState(null); // { courseId, lessonId }
  const [loading, setLoading] = useState(true);

  // Form State
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTime, setNewCourseTime] = useState('');
  const [newCourseDate, setNewCourseDate] = useState('');
  
  // Student Input State
  const [selectedStudent, setSelectedStudent] = useState('');

  // --- FIREBASE: LOAD DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Courses
        const coursesSnapshot = await getDocs(collection(db, "courses"));
        const loadedCourses = [];
        coursesSnapshot.forEach((doc) => {
          const data = doc.data();
          const sanitizedLessons = data.lessons.map(l => ({
            ...l,
            students: l.students || [] 
          }));
          loadedCourses.push({ id: doc.id, ...data, lessons: sanitizedLessons });
        });
        loadedCourses.sort((a, b) => a.name.localeCompare(b.name));
        setCourses(loadedCourses);

        // 2. Fetch Students from 'entries'
        const entriesSnapshot = await getDocs(collection(db, "entries"));
        const codes = new Set();
        entriesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.studentCode) {
            codes.add(data.studentCode);
          }
        });
        // Convert Set to sorted array
        setAllStudentCodes(Array.from(codes).sort());

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- FIREBASE: SAVE FUNCTION ---
  const saveCourseToFirebase = async (course) => {
    try {
      const docRef = doc(db, "courses", course.name);
      await setDoc(docRef, {
        name: course.name,
        timeSlot: course.timeSlot,
        lessons: course.lessons, 
      });
    } catch (e) {
      console.error("Error saving document: ", e);
      alert("Error saving to database");
    }
  };

  // --- ACTIONS ---

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName || !newCourseTime || !newCourseDate) return;

    const lessons = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: DEFAULT_LESSON_NAMES[i],
      dateStr: addDays(newCourseDate, i * 7),
      completed: false,
      students: [] 
    }));

    const newCourse = {
      id: newCourseName, 
      name: newCourseName, 
      timeSlot: newCourseTime,
      lessons,
    };

    setCourses(prev => [...prev, newCourse]);
    await saveCourseToFirebase(newCourse);
    setNewCourseName(''); setNewCourseTime(''); setNewCourseDate('');
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm(`Delete course ${courseId}?`)) {
      try {
        await deleteDoc(doc(db, "courses", courseId));
        setCourses(prev => prev.filter(c => c.id !== courseId));
      } catch (error) {
        console.error("Error deleting course:", error);
      }
    }
  };

  const updateCourseState = (updatedCourse) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    saveCourseToFirebase(updatedCourse);
  };

  // --- LESSON MODIFIERS ---

  const toggleCompletion = (courseId, lessonId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
      )
    };
    updateCourseState(updatedCourse);
  };

  const shiftDates = (courseId, startLessonId, direction) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map(lesson => {
        if (lesson.id >= startLessonId) {
          return {
            ...lesson,
            dateStr: addDays(lesson.dateStr, direction * 7)
          };
        }
        return lesson;
      })
    };
    updateCourseState(updatedCourse);
  };

  // --- STUDENT MANAGEMENT ---

  // Check if student is in THIS lesson ID in ANY OTHER course
  const findConflictCourse = (studentCode, lessonId, currentCourseId) => {
    for (const c of courses) {
      if (c.id === currentCourseId) continue; // Skip current course
      const lesson = c.lessons.find(l => l.id === lessonId);
      if (lesson && lesson.students?.includes(studentCode)) {
        return c.name; // Return name of conflicting course
      }
    }
    return null;
  };

  const addStudentToLesson = (courseId, lessonId) => {
    if (!selectedStudent) return;
    
    // 1. Validation: Is student already in this specific lesson?
    const course = courses.find(c => c.id === courseId);
    const currentLesson = course.lessons.find(l => l.id === lessonId);
    if (currentLesson.students?.includes(selectedStudent)) {
      alert("Student already added to this lesson.");
      return;
    }

    // 2. Validation: Is student in SAME Lesson ID in ANOTHER course?
    const conflictCourseName = findConflictCourse(selectedStudent, lessonId, courseId);
    if (conflictCourseName) {
      alert(`Conflict: Student ${selectedStudent} is already taking Lesson ${lessonId} in course "${conflictCourseName}".`);
      return;
    }

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map(lesson => {
        if (lesson.id === lessonId) {
          return {
            ...lesson,
            students: [...(lesson.students || []), selectedStudent]
          };
        }
        return lesson;
      })
    };

    updateCourseState(updatedCourse);
    setSelectedStudent(''); // Reset selection
  };

  const removeStudentFromLesson = (courseId, lessonId, studentCode) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map(lesson => {
        if (lesson.id === lessonId) {
          return {
            ...lesson,
            students: (lesson.students || []).filter(s => s !== studentCode)
          };
        }
        return lesson;
      })
    };
    updateCourseState(updatedCourse);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-gray-800">
      <h1 className="text-3xl font-bold text-center mb-8 tracking-wider">
        ADMIN DASHBOARD
      </h1>

      {/* --- Add Course Form --- */}
      <div className="max-w-4xl mx-auto mb-12 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create New Course</h2>
        <form onSubmit={handleCreateCourse} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Course ID</label>
            <input 
              type="text" placeholder="SPEC_C001" 
              className="px-3 py-2 border rounded w-32 font-mono uppercase"
              value={newCourseName} onChange={e => setNewCourseName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Slot</label>
            <input 
              type="text" placeholder="SAT 14:00" 
              className="px-3 py-2 border rounded w-48"
              value={newCourseTime} onChange={e => setNewCourseTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
            <input 
              type="date" 
              className="px-3 py-2 border rounded"
              value={newCourseDate} onChange={e => setNewCourseDate(e.target.value)}
            />
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition-colors">
            Add & Save
          </button>
        </form>
      </div>

      {/* --- Timetable Grid --- */}
      <div className="overflow-x-auto border border-gray-200 shadow-lg mb-20 pb-32">
        <table className="min-w-full text-center text-sm border-collapse">
          <thead>
            {/* Header Row 1: Course Names */}
            <tr className="bg-white">
              <th className="p-4 border border-gray-200 w-64 bg-gray-50"></th>
              {courses.map(course => (
                <th key={course.id} className="p-4 border border-gray-200 font-bold text-gray-800 bg-gray-50 min-w-[140px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">{course.name}</span>
                    <button 
                      onClick={() => handleDeleteCourse(course.id)}
                      className="text-[10px] text-red-500 hover:text-red-700 hover:underline font-normal cursor-pointer"
                    >
                      Delete Course
                    </button>
                  </div>
                </th>
              ))}
            </tr>
            {/* Header Row 2: Time Slots */}
            <tr className="bg-white">
              <th className="p-2 border border-gray-200 bg-gray-50"></th>
              {courses.map(course => (
                <th key={course.id} className="p-2 border border-gray-200 font-normal text-gray-500 text-xs bg-gray-50">
                  {course.timeSlot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }).map((_, rowIndex) => {
              const lessonNum = rowIndex + 1;
              const isLastRows = lessonNum >= 9;

              const lessonName = courses[0]?.lessons.find(l => l.id === lessonNum)?.name || DEFAULT_LESSON_NAMES[rowIndex];

              return (
                <tr key={lessonNum}>
                  {/* LEFT COLUMN: Lesson Name */}
                  <td className="p-3 border border-gray-200 bg-gray-50 text-left align-top w-64">
                    <div className="font-bold text-gray-800 mb-1">Lesson {lessonNum}</div>
                    <div className="text-blue-700 font-semibold text-xs leading-snug">
                      {lessonName}
                    </div>
                  </td>

                  {/* COURSE CELLS */}
                  {courses.map(course => {
                    const lesson = course.lessons.find(l => l.id === lessonNum);
                    if (!lesson) return <td key={course.id} className="border border-gray-200"></td>;

                    const isSelected = selectedCell?.courseId === course.id && selectedCell?.lessonId === lesson.id;
                    const studentCount = lesson.students?.length || 0;

                    return (
                      <td 
                        key={course.id} 
                        className={`
                          relative p-3 border border-gray-200 cursor-pointer transition-colors align-middle
                          ${lesson.completed ? 'bg-[#98D896]' : 'bg-white hover:bg-gray-50'}
                        `}
                        onClick={() => {
                          setSelectedCell({ courseId: course.id, lessonId: lesson.id });
                          setSelectedStudent('');
                        }}
                      >
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-base font-medium text-gray-800">
                            {formatDateDisplay(lesson.dateStr)}
                          </span>
                          {/* Student Count Badge */}
                          {studentCount > 0 && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded-full">
                              {studentCount} Students
                            </span>
                          )}
                        </div>

                        {/* --- Popup Menu --- */}
                        {isSelected && (
                          <div 
                            className={`
                              absolute left-1/2 -translate-x-1/2 z-50 w-72 bg-white shadow-2xl rounded-lg border border-gray-300 p-3 flex flex-col gap-3 text-left
                              ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'}
                            `}
                            onClick={(e) => e.stopPropagation()} 
                          >
                            {/* 1. Status Button */}
                            <button 
                              onClick={() => toggleCompletion(course.id, lesson.id)}
                              className={`text-xs w-full py-2 rounded text-white font-bold text-center ${lesson.completed ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                            >
                              {lesson.completed ? 'Mark Incomplete' : 'Mark Completed'}
                            </button>

                            <div className="h-px bg-gray-200"></div>

                            {/* 2. Student Management */}
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Students ({lesson.students?.length || 0})</p>
                              
                              {/* Dropdown Menu */}
                              <div className="flex gap-1 mb-2">
                                <select
                                  className="flex-1 border rounded px-2 py-1 text-xs bg-white"
                                  value={selectedStudent}
                                  onChange={(e) => setSelectedStudent(e.target.value)}
                                >
                                  <option value="">Select Student...</option>
                                  {allStudentCodes.map(code => {
                                    // Calculate conflict for this specific item
                                    const conflict = findConflictCourse(code, lesson.id, course.id);
                                    const isAlreadyInThisLesson = lesson.students?.includes(code);
                                    
                                    // Disable if conflicted or already added
                                    const isDisabled = !!conflict || isAlreadyInThisLesson;
                                    
                                    let label = code;
                                    if (conflict) label += ` (in ${conflict})`;
                                    if (isAlreadyInThisLesson) label += ` (Added)`;

                                    return (
                                      <option key={code} value={code} disabled={isDisabled} className={isDisabled ? "text-gray-400" : ""}>
                                        {label}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button 
                                  onClick={() => addStudentToLesson(course.id, lesson.id)}
                                  className="bg-blue-600 text-white text-xs px-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                  disabled={!selectedStudent}
                                >
                                  +
                                </button>
                              </div>

                              {/* Student List */}
                              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 border border-gray-100 rounded p-1">
                                {lesson.students && lesson.students.map(studentCode => (
                                  <div key={studentCode} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                                    <span className="text-xs font-mono text-gray-700">{studentCode}</span>
                                    <button 
                                      onClick={() => removeStudentFromLesson(course.id, lesson.id, studentCode)}
                                      className="text-gray-400 hover:text-red-500 font-bold text-xs px-1"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                                {(!lesson.students || lesson.students.length === 0) && (
                                  <div className="text-xs text-gray-400 italic text-center py-1">No students enrolled</div>
                                )}
                              </div>
                            </div>
                            
                            <div className="h-px bg-gray-200"></div>

                            {/* 3. Date Shifting */}
                            <div>
                              <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Shift Schedule</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => shiftDates(course.id, lesson.id, -1)}
                                  className="flex-1 text-[10px] py-1 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 text-yellow-800 text-center"
                                >
                                  -1 Wk
                                </button>
                                <button 
                                  onClick={() => shiftDates(course.id, lesson.id, 1)}
                                  className="flex-1 text-[10px] py-1 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-blue-800 text-center"
                                >
                                  +1 Wk
                                </button>
                              </div>
                            </div>

                          </div>
                        )}
                        
                        {/* Backdrop to close menu */}
                        {isSelected && (
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
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
    </div>
  );
}
