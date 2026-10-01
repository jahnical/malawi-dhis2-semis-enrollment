import { enrollmentsForTransition, type TransitionPlan } from "dhis2-semis-functions";
import { reducer } from "../common/formatDistinctValue";

interface enrollmentPostBodyInterface {
    programId: string,
    orgUnitId: string,
    enrollmentDate: string
    trackedEntityId?: string,
    trackedEntityType: string,
    formVariablesFields: any[],
    values: Record<string, any>,
    programStagesToSave: (string | undefined)[],
    // From planEnrollmentTransition: earlier ACTIVE enrollments to complete and the status of this one
    plan: TransitionPlan,
    // From enrollmentDates: enrolledAt is the date entered, occurredAt the academic year start
    dates: { enrolledAt?: string, occurredAt?: string },
}

export const enrollmentPostBody = ({ formVariablesFields, programId, orgUnitId, enrollmentDate, programStagesToSave, trackedEntityType, trackedEntityId, values, plan, dates }: enrollmentPostBodyInterface) => {
    const form: { attributes: any[], events: any[] } = {
        attributes: [],
        events: []
    }

    for (const enrollmentData of formVariablesFields) {
        if (enrollmentData?.[0]?.type === "attribute") {
            enrollmentData.forEach((attribute: { id: string }) => {
                if (values[attribute.id]) {
                    form.attributes.push({ attribute: attribute.id, value: values[attribute.id] })
                }
            });
        } else if (enrollmentData?.[0]?.type === "dataElement") {
            for (const [key, value] of Object.entries(reducer(enrollmentData, values))) {
                form.events.push({
                    notes: [],
                    orgUnit: orgUnitId,
                    status: "ACTIVE",
                    program: programId,
                    programStage: key,
                    dataValues: value,
                    occurredAt: enrollmentDate,
                    scheduledAt: enrollmentDate,
                })
            }
        }
    }

    programStagesToSave.forEach(programStageToSave => {
        form.events.push({
            orgUnit: orgUnitId,
            notes: [],
            status: "ACTIVE",
            program: programId,
            occurredAt: enrollmentDate,
            scheduledAt: enrollmentDate,
            programStage: programStageToSave,
        })
    })

    return {
        trackedEntities: [
            {
                enrollments: enrollmentsForTransition({
                    plan,
                    trackedEntity: trackedEntityId,
                    program: programId,
                    enrollment: {
                        orgUnit: orgUnitId,
                        events: form?.events?.filter(event => event.programStage !== undefined),
                        attributes: form.attributes,
                        occurredAt: dates.occurredAt ?? enrollmentDate,
                        enrolledAt: dates.enrolledAt ?? enrollmentDate,
                    },
                }),
                orgUnit: orgUnitId,
                trackedEntityType,
                ...(trackedEntityId ? { trackedEntity: trackedEntityId } : {})
            }
        ]
    }
}