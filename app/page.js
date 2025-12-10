"use client";
import React, { useState } from 'react';

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

// --- DATA ---

const LESSON_DATA = {
  1: { name: "故事起航 - 認識自我與舞台", description: "自我介紹、清晰發音、肢體語言" },
  2: { name: "句子結構大師 - 清晰表達", description: "主語、動詞、賓語結構應用" },
  3: { name: "圖片說故事 - Show and Tell", description: "觀察圖片細節、描述內容" },
  4: { name: "禮儀小達人 - 優雅與尊重", description: "社交禮儀、問候、聆聽" },
  5: { name: "故事結構大挑戰 - 圖卡排序", description: "故事邏輯、開頭經過結尾" },
  6: { name: "故事連貫大師 - 連接詞應用", description: "連接詞運用、故事流暢度" },
  7: { name: "形容詞魔法 - 豐富故事描述", description: "形容詞運用、增強感染力" },
  8: { name: "故事與情感 - 聲音與表情", description: "情感表達、聲音控制" },
  9: { name: "創意故事編織 - 想像力啟動", description: "創意思維、故事創作" },
  10: { name: "即興創作 - 快速應變", description: "即興反應、語言組織" },
  11: { name: "創意畫作分享 - 繪畫與內心表達", description: "畫作描述、內心世界分享" },
  12: { name: "故事演講家 - 學習成果演示", description: "綜合應用、成果展示" },
};

export default function AdminTimetable() {
  // --- STATE ---
  const [courses, setCourses] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null); // { courseId, lessonId }
  
  // Form State
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTime, setNewCourseTime] = useState('');
  const [newCourseDate, setNewCourseDate] = useState('');

  // --- ACTIONS ---

  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!newCourseName || !newCourseTime || !newCourseDate) return;

    const lessons = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      dateStr: addDays(newCourseDate, i * 7),
      completed: false,
    }));

    const newCourse = {
      id: Date.now().toString(),
      name: newCourseName,
      timeSlot: newCourseTime,
      lessons,
    };

    setCourses([...courses, newCourse]);
    setNewCourseName(''); setNewCourseTime(''); setNewCourseDate('');
  };

  const handleDeleteCourse = (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
    }
  };

  const toggleCompletion = (courseId, lessonId) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return {
        ...course,
        lessons: course.lessons.map(lesson => 
          lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
        )
      };
    }));
    setSelectedCell(null);
  };

  const shiftDates = (courseId, startLessonId, direction) => {
    setCourses(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return {
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
    }));
    setSelectedCell(null);
  };

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-gray-800">
      <h1 className="text-3xl font-bold text-center mb-8 tracking-wider">
        ADMIN TIMETABLE DASHBOARD
      </h1>

      {/* --- Add Course Form --- */}
      <div className="max-w-4xl mx-auto mb-12 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create New Course</h2>
        <form onSubmit={handleCreateCourse} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
            <input 
              type="text" placeholder="e.g. SPEC_C01" 
              className="px-3 py-2 border rounded w-32"
              value={newCourseName} onChange={e => setNewCourseName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
            <input 
              type="text" placeholder="SAT 14:00" 
              className="px-3 py-2 border rounded w-40"
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
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
            Add Course
          </button>
        </form>
      </div>

      {/* --- Main Timetable Grid --- */}
      {courses.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 shadow-lg mb-20 pb-20">
          <table className="min-w-full text-center text-sm border-collapse">
            <thead>
              {/* Header Row 1: Course Names & Delete Button */}
              <tr className="bg-white">
                <th className="p-4 border border-gray-200 w-64 bg-gray-50"></th>
                {courses.map(course => (
                  <th key={course.id} className="p-4 border border-gray-200 font-bold text-gray-800 bg-gray-50">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base">{course.name}</span>
                      <button 
                        onClick={() => handleDeleteCourse(course.id)}
                        className="text-[10px] text-red-500 hover:text-red-700 hover:underline cursor-pointer font-normal"
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
              {/* Rows 1-12 */}
              {Array.from({ length: 12 }).map((_, rowIndex) => {
                const lessonNum = rowIndex + 1;
                const lessonInfo = LESSON_DATA[lessonNum];
                
                // Determine if this is one of the last 3 rows (to flip menu upward)
                const isLastRows = lessonNum >= 10;

                return (
                  <tr key={lessonNum}>
                    {/* Lesson Info Column */}
                    <td className="p-3 border border-gray-200 bg-gray-50 text-left align-top w-64">
                      <div className="font-bold text-gray-700 mb-1">Lesson {lessonNum}</div>
                      <div className="font-semibold text-blue-800 text-xs mb-1 leading-tight">
                        {lessonInfo.name}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-snug">
                        {lessonInfo.description}
                      </div>
                    </td>

                    {/* Course Date Cells */}
                    {courses.map(course => {
                      const lesson = course.lessons.find(l => l.id === lessonNum);
                      if (!lesson) return <td key={course.id} className="border border-gray-200"></td>;

                      const isSelected = selectedCell?.courseId === course.id && selectedCell?.lessonId === lesson.id;

                      return (
                        <td 
                          key={course.id} 
                          className={`
                            relative p-3 border border-gray-200 cursor-pointer transition-colors align-middle
                            ${lesson.completed ? 'bg-[#98D896]' : 'bg-white hover:bg-gray-50'}
                          `}
                          onClick={() => setSelectedCell({ courseId: course.id, lessonId: lesson.id })}
                        >
                          <span className="font-medium text-gray-800 text-base">
                            {formatDateDisplay(lesson.dateStr)}
                          </span>

                          {/* --- Admin Context Menu --- */}
                          {isSelected && (
                            <div 
                              className={`
                                absolute left-1/2 -translate-x-1/2 z-50 w-48 bg-white shadow-2xl rounded border border-gray-300 p-2 flex flex-col gap-2 text-left
                                ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'} 
                              `}
                            >
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleCompletion(course.id, lesson.id); }}
                                className={`text-xs px-3 py-2 rounded text-white font-bold text-center shadow-sm ${lesson.completed ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                              >
                                {lesson.completed ? 'Mark Incomplete' : 'Mark Completed'}
                              </button>

                              <div className="h-px bg-gray-200 my-1"></div>
                              <p className="text-[10px] text-gray-400 font-bold px-1 uppercase">Shift Schedule</p>

                              <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); shiftDates(course.id, lesson.id, -1); }}
                                  className="flex-1 text-xs py-1 px-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 hover:bg-yellow-100 shadow-sm"
                                >
                                  -1 Week
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); shiftDates(course.id, lesson.id, 1); }}
                                  className="flex-1 text-xs py-1 px-2 bg-blue-50 text-blue-800 rounded border border-blue-200 hover:bg-blue-100 shadow-sm"
                                >
                                  +1 Week
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Close Menu Backdrop */}
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
      ) : (
        <div className="text-center text-gray-400 mt-20 border-2 border-dashed border-gray-200 rounded-lg p-10">
          <p>No courses yet.</p>
          <p className="text-sm">Use the form above to add your first class schedule.</p>
        </div>
      )}
    </div>
  );
}
