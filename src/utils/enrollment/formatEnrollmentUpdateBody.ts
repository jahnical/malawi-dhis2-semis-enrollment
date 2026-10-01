import { format } from "date-fns";
import { keepEnrollmentFields, type ExistingEnrollment } from "dhis2-semis-functions";
import { reducer } from "../common/formatDistinctValue";

interface enrollmentUpdateBodyInterface {
    programId: string,
    orgUnitId: string,
    enrollmentDate: string,
    trackedEntityId: string,
    trackedEntityType: string,
    formValues: Record<string, any>,
    enrollmentId: string,
    events: any[],
    formVariablesFields: any[],
    // The enrollment as saved: its status, org unit and dates are sent back unchanged
    existingEnrollment: Pick<ExistingEnrollment, "orgUnit" | "status" | "enrolledAt" | "occurredAt">,
    // True when the user edited the enrollment date: only then does enrolledAt change
    enrollmentDateChanged: boolean,
    // Start of the academic year when the user changed the academic year (the new incident date)
    academicYearStart?: string,
    registrationStage: string,
}

export const enrollmentUpdateBody = ({ formVariablesFields, enrollmentId, enrollmentDate, trackedEntityId, trackedEntityType, orgUnitId, programId, formValues, events,
    existingEnrollment, enrollmentDateChanged, academicYearStart, registrationStage }: enrollmentUpdateBodyInterface): any => {
    const form: { attributes: any[], events: any[] } = {
        attributes: [],
        events: []
    }
    const isSavedEvent = (event: any) => Boolean(event) && Object.keys(event).length > 4
    // New events go where the learner is registered now (the registration event's school)
    const registrationOrgUnit = events?.find((event: any) => event?.programStage === registrationStage && isSavedEvent(event))?.orgUnit ?? orgUnitId

    for (const data of formVariablesFields) {
        if (!data || !data.length) continue;

        if (data[0]?.type === "attribute") {
            data.forEach((attribute: { id: string }) => {
                const value = formValues[attribute.id];
                if (value !== null && value !== undefined) {
                    form.attributes.push({ attribute: attribute.id, value });
                }
            })
        }
        else if (data[0]?.type === "dataElement") {
            for (const [key, value] of Object.entries(reducer(data, formValues))) {
                const event = events?.find((event: any) => event.programStage === key)
                if (isSavedEvent(event)) {
                    // Existing events keep their org unit, dates and status
                    const { createdAt, updatedAt, ...savedEvent } = event
                    form.events.push({
                        ...savedEvent,
                        dataValues: returnEventDataValues(value as Record<string, any>[])
                    })
                }
                else
                    form.events.push({
                        notes: [],
                        orgUnit: registrationOrgUnit,
                        status: "COMPLETED",
                        programStage: key,
                        program: programId,
                        enrollment: enrollmentId,
                        trackedEntity: trackedEntityId,
                        dataValues: returnEventDataValues(value as Record<string, any>[]),
                        occurredAt: format(new Date(enrollmentDate), "yyyy-MM-dd'T'HH:mm:ss.SSS"),
                        scheduledAt: format(new Date(enrollmentDate), "yyyy-MM-dd'T'HH:mm:ss.SSS"),
                    })
            }
        }

    }

    return {
        trackedEntities: [
            {
                enrollments: [
                    {
                        program: programId,
                        enrollment: enrollmentId,
                        ...keepEnrollmentFields(existingEnrollment),
                        ...(enrollmentDateChanged ? { enrolledAt: enrollmentDate } : {}),
                        ...(academicYearStart ? { occurredAt: academicYearStart } : {}),
                        attributes: form.attributes,
                        events: form.events
                    }
                ],
                orgUnit: orgUnitId,
                trackedEntity: trackedEntityId,
                trackedEntityType,
            }
        ]
    }
}


const returnEventDataValues = (dataValues: Record<string, any>[]) => {
    return dataValues.map(({ dataElement, value }) => ({
        dataElement,
        ...(value !== null && value !== undefined ? { value } : {})
    }));
};
