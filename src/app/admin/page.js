// src/app/admin/page.js
"use client";
import React, { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import TimetableTab from "@/components/dashboard/TimetableTab";
import StudentsTab from "@/components/dashboard/StudentsTab";
import EnrollmentTab from "@/components/dashboard/EnrollmentTab";

export default function AdminDashboard() {
  const { 
    allCourses, setAllCourses, 
    allStudents, setAllStudents, 
    loading, 
    availableCategories, availableRounds,
    createCourse, deleteCourse, 
    addStudentToLesson, removeStudentFromLesson, 
    toggleLessonCompletion, shiftCourseDates, saveCourseToFirebase
  } = useAdminData();

  const [activeTab, setActiveTab] = useState("TIMETABLE");

  if (loading) return <div className="p-20 text-center text-xl font-bold text-gray-500">Loading System Data...</div>;

  // Callback to update parent state when a child component modifies a course
  const handleCourseUpdate = async (updatedCourse) => {
    setAllCourses(prev => prev.map(c => c.id === updatedCourse.id && c._path.round === updatedCourse._path.round ? updatedCourse : c));
    await saveCourseToFirebase(updatedCourse);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Siuroma Kids Admin</h1>
        <div className="flex gap-1 bg-white p-1 rounded-lg shadow-sm border">
          {["TIMETABLE", "STUDENTS", "ENROLLMENT"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === tab ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main>
        {activeTab === "TIMETABLE" && (
          <TimetableTab
            allCourses={allCourses}
            allStudents={allStudents}
            availableCategories={availableCategories}
            availableRounds={availableRounds}
            onCreateCourse={createCourse}
            onDeleteCourse={deleteCourse}
            onAddStudent={addStudentToLesson}
            onRemoveStudent={removeStudentFromLesson}
            onToggleCompletion={toggleLessonCompletion}
            onShiftDates={shiftCourseDates}
          />
        )}

        {activeTab === "STUDENTS" && (
          <StudentsTab
            allStudents={allStudents}
            allCourses={allCourses}
            setAllStudents={setAllStudents}
            onCourseSave={handleCourseUpdate}
          />
        )}

        {activeTab === "ENROLLMENT" && (
          <EnrollmentTab
            allCourses={allCourses}
            setAllStudents={setAllStudents}
            saveCourseToFirebase={saveCourseToFirebase}
          />
        )}
      </main>
    </div>
  );
}
