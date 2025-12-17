// src/components/dashboard/EnrollmentTab.js
"use client";
import React, { useState, useMemo } from "react";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export default function EnrollmentTab({
  allCourses,
  setAllStudents,
  saveCourseToFirebase,
}) {
  // FORM STATE
  const [enrollId, setEnrollId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollChiName, setEnrollChiName] = useState("");
  const [enrollLang, setEnrollLang] = useState("Cantonese");
  const [enrollCondition, setEnrollCondition] = useState("");
  const [enrollSex, setEnrollSex] = useState("M");
  const [enrollLevel, setEnrollLevel] = useState("K3");
  const [enrollFavChar, setEnrollFavChar] = useState("");
  const [enrollAllergies, setEnrollAllergies] = useState("NIL");
  const [enrollComfort, setEnrollComfort] = useState("");
  const [enrollParentName, setEnrollParentName] = useState("");
  const [enrollParentEmail, setEnrollParentEmail] = useState("");
  const [enrollCourse, setEnrollCourse] = useState("");
  const [enrollRound, setEnrollRound] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("");

  // Only show courses/rounds that exist in Firestore (from allCourses)
  const availableCourses = useMemo(
    () => Array.from(new Set(allCourses.map((c) => c.id))).sort(),
    [allCourses]
  );

  const availableRoundsForSelectedCourse = useMemo(
    () =>
      Array.from(
        new Set(
          allCourses
            .filter((c) => c.id === enrollCourse)
            .map((c) => c._path.round)
        )
      ).sort(),
    [allCourses, enrollCourse]
  );

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollId || !enrollName || !enrollCourse || !enrollRound) return;
    setEnrollmentStatus("Processing...");

    try {
      const studentRef = doc(db, "students", enrollId);
      const studentSnap = await getDoc(studentRef);

      let enrollmentData = [];
      let currentData = {};

      const newPersonalInfo = {
        name: enrollName,
        chineseName: enrollChiName,
        preferredLanguage: enrollLang,
        condition: enrollCondition,
        sex: enrollSex,
        level: enrollLevel,
        favChar: enrollFavChar,
        allergies: enrollAllergies,
        comfortMethod: enrollComfort,
        parentName: enrollParentName,
        parentContact: enrollParentEmail,
      };

      if (studentSnap.exists()) {
        currentData = studentSnap.data();
        enrollmentData = currentData.enrollment || [];
      } else {
        currentData = { personalInfo: newPersonalInfo, enrollment: [] };
        await setDoc(studentRef, currentData);
        setAllStudents((prev) => [
          ...prev,
          {
            id: enrollId,
            name: enrollName,
            personalInfo: newPersonalInfo,
            enrollment: [],
          },
        ]);
      }

      const alreadyEnrolled = enrollmentData.some(
        (e) =>
          e.courseName === enrollCourse &&
          (e.round === enrollRound || e.iteration === enrollRound)
      );

      if (!alreadyEnrolled) {
        const selectedCourseObj = allCourses.find(
          (c) => c.id === enrollCourse && c._path.round === enrollRound
        );

        const allLessonsForStudent = selectedCourseObj
          ? selectedCourseObj.lessons.map((l) => ({
              id: l.id,
              name: l.name,
              dateStr: l.dateStr,
              timeSlot: selectedCourseObj.timeSlot,
              courseName: enrollCourse,
              completed: false,
            }))
          : [];

        enrollmentData.push({
          courseName: enrollCourse,
          round: enrollRound,
          lessons: allLessonsForStudent,
        });

        await updateDoc(studentRef, {
          enrollment: enrollmentData,
          personalInfo: newPersonalInfo,
        });

        // Update local student list
        setAllStudents((prev) =>
          prev.map((s) =>
            s.id === enrollId
              ? { ...s, enrollment: enrollmentData, personalInfo: newPersonalInfo }
              : s
          )
        );

        // Update course roster
        if (selectedCourseObj) {
          const updatedCourse = {
            ...selectedCourseObj,
            lessons: selectedCourseObj.lessons.map((l) => ({
              ...l,
              students: [...l.students, enrollId],
            })),
          };
          await saveCourseToFirebase(updatedCourse);
        }

        setEnrollmentStatus(
          `Success! ${enrollName} enrolled in ALL lessons of ${enrollCourse}.`
        );

        // reset form
        setEnrollId("");
        setEnrollName("");
        setEnrollChiName("");
        setEnrollCondition("");
        setEnrollCourse("");
        setEnrollRound("");
        setEnrollSex("M");
        setEnrollLevel("K3");
        setEnrollFavChar("");
        setEnrollAllergies("NIL");
        setEnrollComfort("");
        setEnrollParentName("");
        setEnrollParentEmail("");
      } else {
        setEnrollmentStatus("Student already enrolled in this Round.");
      }
    } catch (err) {
      console.error(err);
      setEnrollmentStatus("Error enrolling student.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 shadow rounded">
      <h2 className="text-xl font-bold mb-4">Enroll New Student</h2>

      <form onSubmit={handleEnrollStudent} className="space-y-6">
        {/* Row 1: ID, Names */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Student ID *</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollId}
              onChange={(e) => setEnrollId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Eng Name *</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollName}
              onChange={(e) => setEnrollName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Chi Name</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollChiName}
              onChange={(e) => setEnrollChiName(e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Sex</label>
            <select
              className="w-full border p-2 rounded"
              value={enrollSex}
              onChange={(e) => setEnrollSex(e.target.value)}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Level</label>
            <select
              className="w-full border p-2 rounded"
              value={enrollLevel}
              onChange={(e) => setEnrollLevel(e.target.value)}
            >
              <option value="K1">K1</option>
              <option value="K2">K2</option>
              <option value="K3">K3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Language</label>
            <select
              className="w-full border p-2 rounded"
              value={enrollLang}
              onChange={(e) => setEnrollLang(e.target.value)}
            >
              <option value="Cantonese">Cantonese</option>
              <option value="English">English</option>
              <option value="Mandarin">Mandarin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Fav Character</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollFavChar}
              onChange={(e) => setEnrollFavChar(e.target.value)}
            />
          </div>
        </div>

        {/* Row 3: Medical / Parent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Allergies</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollAllergies}
              onChange={(e) => setEnrollAllergies(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Conditions</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollCondition}
              onChange={(e) => setEnrollCondition(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Comfort Method</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollComfort}
              onChange={(e) => setEnrollComfort(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Parent Name</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollParentName}
              onChange={(e) => setEnrollParentName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Parent Contact</label>
            <input
              className="w-full border p-2 rounded"
              value={enrollParentEmail}
              onChange={(e) => setEnrollParentEmail(e.target.value)}
            />
          </div>
        </div>

        <hr className="my-4" />

        {/* Course & Round selection (only existing combos) */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
          <div>
            <label className="block text-xs font-bold mb-1">
              Select Course *
            </label>
            <select
              className="w-full border p-2 rounded"
              value={enrollCourse}
              onChange={(e) => {
                setEnrollCourse(e.target.value);
                setEnrollRound("");
              }}
              required
            >
              <option value="">-- Choose Course --</option>
              {availableCourses.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">
              Select Round *
            </label>
            <select
              className="w-full border p-2 rounded"
              value={enrollRound}
              onChange={(e) => setEnrollRound(e.target.value)}
              disabled={!enrollCourse}
              required
            >
              <option value="">
                {enrollCourse ? "-- Choose Round --" : "Select course first"}
              </option>
              {availableRoundsForSelectedCourse.map((r) => (
                <option key={r} value={r}>
                  {r.replace("round_", "round_")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition"
        >
          Enroll Student
        </button>

        {enrollmentStatus && (
          <div
            className={`p-4 rounded text-center font-bold ${
              enrollmentStatus.includes("Success")
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {enrollmentStatus}
          </div>
        )}
      </form>
    </div>
  );
}
