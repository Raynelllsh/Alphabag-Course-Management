"use client";
import React, { useState, useMemo, useEffect } from "react";
import { formatDateDisplay, MAX_STUDENTS } from "@/utils/adminConstants";

export default function TimetableTab({
  allCourses,
  allStudents,
  availableCategories,
  availableRounds,
  onCreateCourse,
  onDeleteCourse,
  onAddStudent,
  onRemoveStudent,
  onToggleCompletion,
  onShiftDates,
}) {
  // --- STATE ---
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterRound, setFilterRound] = useState("ALL");
  const [selectedCell, setSelectedCell] = useState(null); // { courseId, lessonId }
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState("");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    time: "",
    date: "",
    round: "001",
  });

  // --- INITIAL FILTER SETUP ---
  useEffect(() => {
    if (availableCategories.length > 0 && filterCategory === "ALL") {
      setFilterCategory(availableCategories[0]);
    }
    if (availableRounds.length > 0 && filterRound === "ALL") {
      setFilterRound(availableRounds[0]);
    }
  }, [availableCategories, availableRounds, filterCategory, filterRound]);

  // --- DERIVED DATA (Memoized to prevent loops) ---
  const displayedCourses = useMemo(() => {
    return allCourses.filter((c) => {
      const matchCat =
        filterCategory === "ALL" || c._path.category === filterCategory;
      const matchRound =
        filterRound === "ALL" || c._path.round === filterRound;
      return matchCat && matchRound;
    });
  }, [allCourses, filterCategory, filterRound]);

  // --- HANDLERS ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (
      !createForm.name ||
      !createForm.time ||
      !createForm.date ||
      !createForm.round
    )
      return;

    const cat = await onCreateCourse(
      createForm.name,
      createForm.time,
      createForm.date,
      createForm.round
    );
    setFilterCategory(cat); // Switch to new category
    setCreateForm({ name: "", time: "", date: "", round: "001" });
  };

  const handleAdd = async () => {
    if (!selectedCell || !selectedStudentToAdd) return;
    const res = await onAddStudent(
      selectedCell.courseId,
      selectedCell.lessonId,
      selectedStudentToAdd
    );
    if (res?.success) {
      setSelectedStudentToAdd("");
    } else if (res?.msg) {
      alert(res.msg);
    }
  };

  // --- RENDER HELPERS ---
  const getCellData = (course, lessonId) => {
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    const count = lesson.students.length;
    const isFull = count >= MAX_STUDENTS;
    return { ...lesson, count, isFull };
  };

  // Find the active lesson data for the popup
  const activeLessonData = useMemo(() => {
    if (!selectedCell) return null;
    const course = allCourses.find((c) => c.id === selectedCell.courseId);
    if (!course) return null;
    const lesson = course.lessons.find((l) => l.id === selectedCell.lessonId);
    return { course, lesson };
  }, [selectedCell, allCourses]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
      {/* 1. TOP BAR: FILTERS & ACTIONS */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-wrap gap-6 items-end justify-between shrink-0">
        
        {/* Filters */}
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Category
            </label>
            <select
              className="border p-2 rounded text-sm min-w-[120px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Round
            </label>
            <select
              className="border p-2 rounded text-sm min-w-[120px]"
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
            >
              {availableRounds.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Create Form */}
        <form onSubmit={handleCreate} className="flex gap-2 items-end">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">ID</label>
            <input
              className="border p-2 rounded text-sm w-24"
              placeholder="SPEC-C1"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Time</label>
            <input
              className="border p-2 rounded text-sm w-24"
              placeholder="10:00"
              value={createForm.time}
              onChange={(e) =>
                setCreateForm({ ...createForm, time: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Start</label>
            <input
              type="date"
              className="border p-2 rounded text-sm"
              value={createForm.date}
              onChange={(e) =>
                setCreateForm({ ...createForm, date: e.target.value })
              }
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700"
          >
            + New Course
          </button>
        </form>
      </div>

      {/* 2. MAIN TABLE AREA (Vertical Layout) */}
      <div className="flex-1 overflow-auto bg-white rounded shadow border border-gray-200 relative">
        <table className="w-full text-sm border-collapse relative">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-gray-50 border-b">
              {/* Sticky Corner */}
              <th className="p-3 border-r bg-gray-100 text-left w-24 sticky left-0 z-30 font-bold text-gray-600">
                Lesson
              </th>
              
              {/* Course Headers */}
              {displayedCourses.map((course, idx) => (
                <th
                  key={`${course.id}_${idx}`} // Robust key
                  className="p-3 border-r min-w-[160px] align-top bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <div className="font-bold text-gray-800 text-base">
                        {course.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {course.timeSlot}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteCourse(course)}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 12 }).map((_, i) => {
              const lessonNum = i + 1;
              const refLessonName =
                displayedCourses[0]?.lessons.find((l) => l.id === lessonNum)
                  ?.name || `Lesson ${lessonNum}`;

              return (
                <tr key={lessonNum} className="hover:bg-gray-50/50">
                  {/* Row Header (Lesson #) */}
                  <td className="p-3 border-r bg-white sticky left-0 z-10 font-medium text-gray-500 text-center">
                    <div className="text-lg font-bold text-gray-300">
                      {lessonNum}
                    </div>
                    <div className="text-[10px] text-blue-600 leading-tight mt-1 truncate w-20 mx-auto">
                      {refLessonName}
                    </div>
                  </td>

                  {/* Course Cells */}
                  {displayedCourses.map((course, idx) => {
                    const data = getCellData(course, lessonNum);
                    if (!data) return <td key={idx} className="border-r bg-gray-50" />;

                    // Determine Cell Style
                    let statusColor = "bg-white";
                    if (data.completed) statusColor = "bg-green-50";
                    else if (data.isFull) statusColor = "bg-red-50";

                    return (
                      <td
                        key={`${course.id}_${idx}_${lessonNum}`}
                        className={`p-2 border-r cursor-pointer transition-all hover:brightness-95 ${statusColor}`}
                        onClick={() => {
                            setSelectedCell({ courseId: course.id, lessonId: lessonNum });
                            setSelectedStudentToAdd("");
                        }}
                      >
                        <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs font-mono font-bold ${data.isFull ? "text-red-600" : "text-gray-600"}`}>
                                {formatDateDisplay(data.dateStr)}
                            </span>
                            {data.count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${data.isFull ? "bg-red-200 text-red-800" : "bg-blue-100 text-blue-700"}`}>
                                    {data.count}
                                </span>
                            )}
                        </div>
                        {/* Mini roster preview */}
                        <div className="flex flex-wrap gap-1">
                            {data.students.map(sid => (
                                <div key={sid} className="w-1.5 h-1.5 rounded-full bg-blue-400" title={sid}></div>
                            ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. EDIT MODAL (Overlay) */}
      {selectedCell && activeLessonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedCell(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{activeLessonData.course.name}</h3>
                    <p className="text-sm text-gray-500">Lesson {activeLessonData.lesson.id} • {activeLessonData.lesson.dateStr}</p>
                </div>
                <button onClick={() => setSelectedCell(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
                {/* Status Toggle */}
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded mb-4 border">
                    <span className="text-sm font-bold text-gray-600">Class Status:</span>
                    <button 
                        onClick={() => onToggleCompletion(activeLessonData.course.id, activeLessonData.lesson.id)}
                        className={`px-3 py-1 rounded text-xs font-bold ${activeLessonData.lesson.completed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}
                    >
                        {activeLessonData.lesson.completed ? "COMPLETED" : "PENDING"}
                    </button>
                </div>

                {/* Student List */}
                <div className="space-y-2 mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Enrolled Students ({activeLessonData.lesson.students.length}/{MAX_STUDENTS})</h4>
                    {activeLessonData.lesson.students.length === 0 && <p className="text-sm text-gray-400 italic">No students yet.</p>}
                    
                    {activeLessonData.lesson.students.map(sid => {
                        const studentName = allStudents.find(s => s.id === sid)?.name || sid;
                        return (
                            <div key={sid} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200">
                                <span className="font-medium text-gray-700">{studentName}</span>
                                <button 
                                    onClick={() => onRemoveStudent(activeLessonData.course.id, activeLessonData.lesson.id, sid)}
                                    className="text-red-400 hover:text-red-600 text-sm font-bold px-2"
                                >
                                    Remove
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Add Student */}
                <div className="border-t pt-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Add Student</h4>
                    <div className="flex gap-2">
                        <select 
                            className="flex-1 border p-2 rounded text-sm bg-white"
                            value={selectedStudentToAdd}
                            onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                        >
                            <option value="">Select Student...</option>
                            {allStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                        </select>
                        <button 
                            disabled={!selectedStudentToAdd || activeLessonData.lesson.students.length >= MAX_STUDENTS}
                            onClick={handleAdd}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50 hover:bg-blue-700"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 p-3 border-t flex justify-between gap-2">
                <button 
                    onClick={() => onShiftDates(activeLessonData.course.id, activeLessonData.lesson.id, -1)}
                    className="flex-1 py-2 bg-white border rounded text-xs text-gray-600 hover:bg-gray-100"
                >
                    Shift Date -7 Days
                </button>
                <button 
                    onClick={() => onShiftDates(activeLessonData.course.id, activeLessonData.lesson.id, 1)}
                    className="flex-1 py-2 bg-white border rounded text-xs text-gray-600 hover:bg-gray-100"
                >
                    Shift Date +7 Days
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
