import { useState } from 'react';
import { format } from 'date-fns';
import useGetSelectedKeys from '../config/useGetSelectedKeys';
import { attributes, dataValues, useGetEnrollment } from 'dhis2-semis-functions';

function useGetEnrollmentUpdateInitialValues() {
    const { getEnrollment } = useGetEnrollment()
    const { dataStoreData } = useGetSelectedKeys()
    const [error, setError] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [initialValues, setInitialValues] = useState<any>({})
    const [enrollmentEvents, setEnrollmentEvents] = useState<any>({})
    const [existingEnrollment, setExistingEnrollment] = useState<any>()
    const { registration, 'socio-economics': socioEconomics, program: programId, } = dataStoreData

    const getInitialValues = async (trackedEntity: string, enrollment: string) => {
        setLoading(true)

        if (Object.keys(dataStoreData)?.length) {
            await getEnrollment(enrollment)
                .then((response: any) => {
                    const registrationData: any = response?.results?.events?.filter((event: any) => event.programStage === dataStoreData?.registration?.programStage)
                    const socioEconomicData: any = response?.results?.events?.filter((event: any) => event.programStage === dataStoreData?.['socio-economics']?.programStage)
                    const registrationEvent = registrationData?.find((x: any) => x.enrollment === enrollment)
                    // The enrollment date shown is the enrollment's own date (enrolledAt), not an event date
                    const enrolledAt = response?.results?.enrolledAt ?? registrationEvent?.occurredAt
                    setExistingEnrollment({
                        status: response?.results?.status,
                        orgUnit: response?.results?.orgUnit,
                        enrolledAt: response?.results?.enrolledAt,
                        occurredAt: response?.results?.occurredAt,
                    })

                    setInitialValues({
                        program: programId,
                        enrollment: enrollment,
                        trackedEntity: trackedEntity,
                        ...attributes(response?.results?.attributes ?? []),
                        orgUnit: registrationData?.find((x: any) => x.enrollment === enrollment)?.orgUnit,
                        enrollmentDate: registrationData?.find((x: any) => x.enrollment === enrollment)?.occurredAt,
                        ...dataValues(registrationData?.find((x: any) => x.enrollment === enrollment)?.dataValues ?? []),
                        ...dataValues(socioEconomicData?.find((x: any) => x.enrollment === enrollment)?.dataValues ?? []),
                        enrollment_date: enrolledAt ? format(new Date(enrolledAt), "yyyy-MM-dd") : undefined,
                    })

                    setEnrollmentEvents({
                        events: [
                            registrationEvent ?? { enrollment: enrollment, programStage: registration?.programStage },
                            socioEconomicData?.find((x: any) => x.enrollment === enrollment) ?? { enrollment: enrollment, programStage: socioEconomics?.programStage },
                        ]
                    })
                })
                .catch(() => {
                    setError(true)
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            setLoading(false)
        }
    }

    return { enrollmentEvents, existingEnrollment, getInitialValues, initialValues, loading, error }
}

export default useGetEnrollmentUpdateInitialValues