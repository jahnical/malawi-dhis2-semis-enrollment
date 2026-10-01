import { format } from "date-fns";
import { VariablesTypes } from "dhis2-semis-types";
import { capitalizeString } from "dhis2-semis-functions";

const staticForm = () => {
  return {
    registeringSchool: {
      required: true,
      name: "registerschoolstaticform",
      labelName: "Registering School",
      valueType: "TEXT",
      options: undefined,
      disabled: true,
      pattern: "",
      visible: true,
      description: "Registering School",
      searchable: false,
      error: false,
      programStage: "",
      content: "",
      id: "registerschoolstaticform",
      displayName: "Registering School",
      header: "Registering School",
      type: VariablesTypes.DataElement,
      assignedValue: undefined
    },
    enrollmentDate: {
      required: true,
      name: "enrollment_date",
      labelName: "Enrollment date",
      valueType: "DATE",
      options: undefined,
      disabled: false,
      pattern: "",
      visible: true,
      description: "Enrollment date",
      searchable: false,
      error: false,
      programStage: "",
      content: "",
      id: "enrollment_date",
      displayName: "Enrollment date",
      header: "Enrollment date",
      type: VariablesTypes.DataElement,
      assignedValue: format(new Date(), "yyyy-MM-dd")
    }
  }
}

function formFields({ formFieldsData, sectionName }: { formFieldsData: any[], sectionName: string }) {

  const [enrollmentDetails = [], studentsProfile = [], socioEconomicDetails = []] = formFieldsData;

  return [
    {
      name: "Enrollment Details",
      description: "Details related to the enrollment process",
      visible: true,
      fields: [
        staticForm().registeringSchool,
        ...enrollmentDetails,
        staticForm().enrollmentDate
      ]
    },
    {
      name: `${capitalizeString(sectionName === 'student' ? 'learner' : sectionName)} Profile`,
      description: `${capitalizeString(sectionName === 'student' ? 'learner' : sectionName)} personal details`,
      visible: true,
      fields: [
        ...studentsProfile
      ]
    },
    {
      name: "Socio-economic Details",
      description: `Details about the ${sectionName === 'student' ? 'learner' : sectionName} socio-economic status`,
      visible: Boolean(socioEconomicDetails.length),
      fields: [
        ...socioEconomicDetails
      ]
    }
  ];
}

export { formFields, staticForm };