import { planEnrollmentTransition } from "dhis2-semis-functions";
import { enrollmentPostBody, enrollmentUpdateBody } from ".";

const REG = "REG", SOCIO = "SOCIO", AY = "AY"
const formVariablesFields = [
    [{ id: "name", type: "attribute" }],
    [{ id: AY, type: "dataElement", programStage: REG }],
    [{ id: "income", type: "dataElement", programStage: SOCIO }],
]
const plan = (existing: any[], target: string) => planEnrollmentTransition({
    existing, targetAcademicYear: target, currentAcademicYear: "2025/2026", registrationStage: REG, academicYearDataElement: AY,
})

test("create: new staff enrollment is ACTIVE, dated to the year start, and closes the previous year", () => {
    const previous = { enrollment: "E1", status: "ACTIVE", orgUnit: "S1", enrolledAt: "2024-09-10", occurredAt: "2024-09-02", events: [{ programStage: REG, dataValues: [{ dataElement: AY, value: "2024/2025" }] }] }
    const body = enrollmentPostBody({
        programId: "P1", orgUnitId: "S2", enrollmentDate: "2025-10-01", trackedEntityType: "TT", trackedEntityId: "T1",
        formVariablesFields, values: { name: "Bo", [AY]: "2025/2026" }, programStagesToSave: [],
        plan: plan([previous], "2025/2026"), dates: { enrolledAt: "2025-10-01", occurredAt: "2025-09-08" },
    })
    const enrollments = body.trackedEntities[0].enrollments
    expect(enrollments.map((e: any) => [e.enrollment, e.status])).toEqual([["E1", "COMPLETED"], [undefined, "ACTIVE"]])
    expect(enrollments[0]).toMatchObject({ orgUnit: "S1", enrolledAt: "2024-09-10", occurredAt: "2024-09-02" })
    expect(enrollments[1]).toMatchObject({ orgUnit: "S2", enrolledAt: "2025-10-01", occurredAt: "2025-09-08" })
})

test("update: status, org unit and dates come from the saved enrollment; saved events keep theirs", () => {
    const registration = { event: "R1", enrollment: "E1", programStage: REG, orgUnit: "S2", occurredAt: "2025-09-20T00:00:00.000", status: "ACTIVE", createdAt: "2025-09-20", dataValues: [] }
    const common = {
        formVariablesFields, enrollmentId: "E1", enrollmentDate: "2025-09-15", trackedEntityId: "T1", trackedEntityType: "TT", orgUnitId: "S9",
        programId: "P1", formValues: { name: "Bo", [AY]: "2025/2026", income: "low" }, registrationStage: REG,
        events: [registration, { enrollment: "E1", programStage: SOCIO }],
        existingEnrollment: { status: "CANCELLED", orgUnit: "S1", enrolledAt: "2025-09-10", occurredAt: "2025-09-08" },
    }
    const unchanged = enrollmentUpdateBody({ ...common, enrollmentDateChanged: false }).trackedEntities[0].enrollments[0]
    expect(unchanged).toMatchObject({ status: "CANCELLED", orgUnit: "S1", enrolledAt: "2025-09-10", occurredAt: "2025-09-08" })
    expect(unchanged.createdAt).toBeUndefined()

    const [savedRegistration, newSocio] = unchanged.events
    expect(savedRegistration).toMatchObject({ event: "R1", orgUnit: "S2", occurredAt: "2025-09-20T00:00:00.000", status: "ACTIVE" })
    expect(savedRegistration.createdAt).toBeUndefined()
    // New events go to the registration event's school, not the header school or the enrollment's
    expect(newSocio).toMatchObject({ programStage: SOCIO, orgUnit: "S2", enrollment: "E1" })

    const edited = enrollmentUpdateBody({ ...common, enrollmentDateChanged: true, academicYearStart: "2025-09-08" }).trackedEntities[0].enrollments[0]
    expect(edited).toMatchObject({ enrolledAt: "2025-09-15", occurredAt: "2025-09-08", status: "CANCELLED" })
})
